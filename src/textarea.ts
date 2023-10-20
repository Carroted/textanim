// fake text area (monospace) in typescript without contenteditable or input or canvas.
// we recycle text nodes and just change their textContent.
// rich output (colors, bold etc) is not yet supported.

/** Good `textarea` replacement for monospace text box with fixed columns and rows. */
class TextArea {
    /** The textarea, all texts are children of it */
    parent: HTMLDivElement;
    lines: HTMLDivElement[];

    private isReadOnly: boolean = false;
    private text: string = "";
    private columnCount: number = 16;
    private rowCount: number = 3;
    private cursor: number = 0;
    private cursorVisible: boolean = false;

    private valueChangedListeners: (() => void)[] = [];
    onValueChanged(listener: () => void) {
        this.valueChangedListeners.push(listener);
    }
    offValueChanged(listener: () => void) {
        this.valueChangedListeners = this.valueChangedListeners.filter((l) => l != listener);
    }
    emitValueChanged() {
        this.valueChangedListeners.forEach((l) => l());
    }
    private clickListeners: (() => void)[] = [];
    onClick(listener: () => void) {
        this.clickListeners.push(listener);
    }
    offClick(listener: () => void) {
        this.clickListeners = this.clickListeners.filter((l) => l != listener);
    }
    emitClick() {
        this.clickListeners.forEach((l) => l());
    }

    get readOnly(): boolean {
        return this.isReadOnly;
    }
    set readOnly(value: boolean) {
        this.isReadOnly = value;
        this.parent.tabIndex = value ? -1 : 0;
        this.update();
        // if focused, blur
        if (this.parent == document.activeElement) {
            this.parent.blur();
        }
    }

    constructor(target: HTMLDivElement) {
        this.parent = target;
        this.parent.classList.add("textarea");
        // give it a tab index
        this.parent.tabIndex = 0;
        this.lines = [];
        this.build();
        this.update();
        this.parent.addEventListener("keydown", (e) => {
            if (this.isReadOnly) return;

            console.log('down')
            // set text[cursor] to e.key if its one char
            if (e.key.length == 1) {
                let text = this.text;
                // pad with nbsp (\u00A0)
                let chars = text.padEnd(this.columnCount * this.rowCount, "\u00A0").split('');
                chars[this.cursor] = e.key;
                // replace ' ' with \u00A0
                this.text = chars.join("").replace(/ /g, '\u00A0');
                // trim to (columns * rows) chars
                if (this.text.length > (this.columnCount * this.rowCount)) {
                    this.text = this.text.substring(0, this.columnCount * this.rowCount);
                }
                this.cursor++;
                if (this.cursor >= this.text.length - 1) {
                    this.cursor = this.text.length - 1;
                }
                this.update();
                this.emitValueChanged();
            }
            // up arrow
            if (e.key == "ArrowUp") {
                this.cursor -= this.columnCount;
                if (this.cursor < 0) {
                    this.cursor = 0;
                }
                this.update();
                e.preventDefault();
            }
            // down arrow
            if (e.key == "ArrowDown") {
                this.cursor += this.columnCount;
                if (this.cursor >= this.text.length - 1) {
                    this.cursor = this.text.length - 1;
                }
                this.update();
                e.preventDefault();
            }
            // left arrow
            if (e.key == "ArrowLeft") {
                this.cursor--;
                if (this.cursor < 0) {
                    this.cursor = 0;
                }
                this.update();
                e.preventDefault();
            }
            // right arrow
            if (e.key == "ArrowRight") {
                this.cursor++;
                if (this.cursor >= this.text.length - 1) {
                    this.cursor = this.text.length - 1;
                }
                this.update();
                e.preventDefault();
            }
        });
        // on focus, cursor visible true, on blur, cursor visible false
        this.parent.addEventListener("focus", () => {
            this.cursorVisible = true;
            this.update();
        });
        this.parent.addEventListener("blur", () => {
            this.cursorVisible = false;
            this.update();
        });
    }

    get value(): string {
        return this.text;
    }
    set value(value: string) {
        this.text = value.split(' ').join('\u00A0').padEnd(this.columnCount * this.rowCount, '\u00A0'); // replace spaces with non-breaking spaces, good for monospace
        if (this.text.length > (this.columnCount * this.rowCount)) {
            this.text = this.text.substring(0, this.columnCount * this.rowCount);
        }
        this.update();
        this.emitValueChanged();
    }
    get cols(): number {
        return this.columnCount;
    }
    set cols(value: number) {
        this.columnCount = value;
        this.build();
        this.update();
    }
    get rows(): number {
        return this.rowCount;
    }
    set rows(value: number) {
        this.rowCount = value;
        this.build();
        this.update();
    }
    get cursorPos(): number {
        return this.cursor;
    }
    set cursorPos(value: number) {
        this.cursor = value;
        if (this.cursor < 0) {
            this.cursor = 0;
        }
        if (this.cursor >= this.text.length - 1) {
            this.cursor = this.text.length - 1;
        }
        this.update();
    }

    // the textarea has no scroll or anything similar. instead, we only show the first rows, and anything else is impossible to see (this is by design)
    // every (cols) chars OR newline, we move to next line.
    // we use textContent instead of innerHTML to avoid XSS of course.

    // build will create the lines
    private build() {
        this.parent.innerHTML = "";
        this.lines = [];
        for (let i = 0; i < this.rowCount; i++) {
            let line = document.createElement("div");
            line.className = "line";
            this.lines.push(line);
            this.parent.appendChild(line);
        }
    }

    setLine(line: number, text: string) {
        // padding with nbsp
        text = text.padEnd(this.columnCount, "\u00A0");
        // we will create loads of spans for each char, that way later on we can add cursor and whatnot
        let chars = text.split("");
        let current = this.lines[line];
        current.innerHTML = "";
        for (let i = 0; i < chars.length; i++) {
            let char = document.createElement("span");
            let index = i + (line * this.columnCount);
            if (!this.isReadOnly) {
                if (index == this.cursor && this.cursorVisible) {
                    char.className = "cursor";
                }
                char.addEventListener("mousedown", (e) => {
                    this.cursor = index;
                    this.update();
                    e.preventDefault();
                    this.parent.focus();
                    this.emitClick();
                });
            }
            else {
                char.addEventListener("mousedown", (e) => {
                    e.preventDefault();
                    this.emitClick();
                });
            }

            char.textContent = chars[i];
            current.appendChild(char);
        }
    }

    // update will update the lines
    private update() {
        let line = 0;
        let text = this.text;
        let chars = text.split("");
        let currentText = "";
        // on newline or hit columns, we move to next line
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] == "\n" || currentText.length >= this.columnCount) {
                this.setLine(line, currentText);
                line++;
                currentText = "";
            }
            currentText += chars[i];
        }
        // update the last line
        this.setLine(line, currentText);
        // empty the rest of the lines with nbsp
        for (let i = line + 1; i < this.lines.length; i++) {
            this.setLine(i, "\u00A0".repeat(this.columnCount));
        }
    }
}

export default TextArea;