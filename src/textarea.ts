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
    private cursorEnd: number = 0;
    private cursorVisible: boolean = false;
    private pointerDown: boolean = false;
    private charSpans: HTMLSpanElement[] = [];

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
    private keyDownListeners: ((e: KeyboardEvent) => "ignore" | "normal")[] = [];
    onKeyDown(listener: (e: KeyboardEvent) => "ignore" | "normal") {
        this.keyDownListeners.push(listener);
    }
    offKeyDown(listener: (e: KeyboardEvent) => void) {
        this.keyDownListeners = this.keyDownListeners.filter((l) => l != listener);
    }

    indexToXY(index: number): [number, number] {
        return [index % this.columnCount, Math.floor(index / this.columnCount)];
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

    constructor(target: HTMLDivElement, rows: number, cols: number, value: string) {
        this.parent = target;
        this.parent.classList.add("textarea");
        // give it a tab index
        this.parent.tabIndex = 0;
        this.lines = [];
        this.rowCount = rows;
        this.columnCount = cols;
        this.text = this.fixString(value);
        this.build();
        this.update();
        this.parent.addEventListener("keydown", (e) => {
            // our handlers act first, even before readonly check. thats the point of the handlers instead of handler on parent, since it allows user to choose what happens first to override our behavior.
            // lets manually call the listeners and see if they want to ignore or not. if even one wants to ignore, we ignore.
            let ignore = false;
            this.keyDownListeners.forEach((l) => {
                if (l(e) === "ignore") {
                    ignore = true;
                }
            });
            if (ignore) return;

            if (this.isReadOnly) return;

            console.log('down')
            // set text[cursor] to e.key if its one char
            if (e.key.length == 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                let text = this.text;
                // pad with nbsp (\u00A0)
                let chars = text.padEnd(this.columnCount * this.rowCount, "\u00A0").split('');
                // if end is at same spot as start, we can just replace
                if (this.cursor == this.cursorEnd) {
                    chars[this.cursor] = e.key;
                }
                // otherwise replace each char in selection with this.isSelected(index)
                else {
                    let textLength = chars.length;
                    for (let i = 0; i < textLength; i++) {
                        if (this.isSelected(i)) {
                            chars[i] = e.key;
                        }
                    }
                }
                // now figure out where to move cursor. it has to be at the end of the selection, but cursorEnd could be before cursor
                let startXY = this.indexToXY(this.cursor);
                let endXY = this.indexToXY(this.cursorEnd);
                let minX = Math.min(startXY[0], endXY[0]);
                let maxX = Math.max(startXY[0], endXY[0]);
                let minY = Math.min(startXY[1], endXY[1]);
                let maxY = Math.max(startXY[1], endXY[1]);
                let newCursor = (maxY * this.columnCount) + maxX;
                this.cursor = newCursor;

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
                this.cursorEnd = this.cursor;
                this.update();
                this.emitValueChanged();
            }
            // up arrow
            if (e.key == "ArrowUp") {
                this.cursor -= this.columnCount;
                if (this.cursor < 0) {
                    this.cursor = 0;
                }
                this.cursorEnd = this.cursor;
                this.update();
                e.preventDefault();
            }
            // down arrow
            if (e.key == "ArrowDown") {
                this.cursor += this.columnCount;
                if (this.cursor >= this.text.length - 1) {
                    this.cursor = this.text.length - 1;
                }
                this.cursorEnd = this.cursor;
                this.update();
                e.preventDefault();
            }
            // left arrow
            if (e.key == "ArrowLeft") {
                this.cursor--;
                if (this.cursor < 0) {
                    this.cursor = 0;
                }
                this.cursorEnd = this.cursor;
                this.update();
                e.preventDefault();
            }
            // right arrow
            if (e.key == "ArrowRight") {
                this.cursor++;
                if (this.cursor >= this.text.length - 1) {
                    this.cursor = this.text.length - 1;
                }
                this.cursorEnd = this.cursor;
                this.update();
                e.preventDefault();
            }
        });
        // on paste, replace starting at cursor, and move cursor to end of pasted text
        document.addEventListener("paste", (e) => {
            if (document.activeElement != this.parent) return;
            if (this.isReadOnly) return;
            let text = this.text;
            // pad with nbsp (\u00A0)
            let chars = text.padEnd(this.columnCount * this.rowCount, "\u00A0").split('');
            let pasted = e.clipboardData!.getData('text/plain');
            // replace ' ' with \u00A0
            pasted = pasted.replace(/ /g, '\u00A0');
            // replace text
            const oldCursor = this.cursor;
            let lineIndex = 0;
            for (let i = 0; i < pasted.length; i++) {
                // if its newline
                if (pasted[i] == "\n") {
                    lineIndex++;
                    // its oldcursor + lineindex * columnCount
                    this.cursor = oldCursor + lineIndex * this.columnCount;
                    this.cursorEnd = this.cursor;

                    continue;
                }
                chars[this.cursor] = pasted[i];
                this.cursor++;
            }
            this.text = chars.join("");
            // trim to (columns * rows) chars
            if (this.text.length > (this.columnCount * this.rowCount)) {
                this.text = this.text.substring(0, this.columnCount * this.rowCount);
            }
            this.update();
            this.emitValueChanged();
            e.preventDefault();
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
        document.addEventListener("mouseup", () => {
            this.pointerDown = false;
        });
    }

    fixString(value: string) {
        value = value.split(' ').join('\u00A0').padEnd(this.columnCount * this.rowCount, '\u00A0');
        if (value.length > (this.columnCount * this.rowCount)) {
            value = value.substring(0, this.columnCount * this.rowCount);
        }
        return value;
    }

    get value(): string {
        return this.text;
    }
    set value(value: string) {
        this.text = this.fixString(value);
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
    get selectionEnd(): number {
        return this.cursorEnd;
    }
    set selectionEnd(value: number) {
        this.cursorEnd = value;
        if (this.cursorEnd < 0) {
            this.cursorEnd = 0;
        }
        if (this.cursorEnd >= this.text.length - 1) {
            this.cursorEnd = this.text.length - 1;
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

    isSelected(index: number): boolean {
        if (!this.cursorVisible) return false;
        // basically, what we want is a box select, not the typical select where every char between is selected.
        let start = this.indexToXY(this.cursor);
        let end = this.indexToXY(this.cursorEnd);
        let current = this.indexToXY(index);

        let minX = Math.min(start[0], end[0]);
        let maxX = Math.max(start[0], end[0]);
        let minY = Math.min(start[1], end[1]);
        let maxY = Math.max(start[1], end[1]);

        // if its within selection, we add cursor class
        if (current[1] >= minY && current[1] <= maxY && current[0] >= minX && current[0] <= maxX) {
            return true;
        }
        return false;
    }

    updateSelection() {
        for (let i = 0; i < this.charSpans.length; i++) {
            let char = this.charSpans[i];
            if (this.isSelected(i)) {
                char.classList.add("cursor");
            } else {
                char.classList.remove("cursor");
            }
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
            if (this.isSelected(index)) {
                char.classList.add("cursor");
            }
            char.addEventListener("mousedown", (e) => {
                this.cursor = index;
                this.cursorEnd = index;
                this.update();
                e.preventDefault();
                this.parent.focus();
                this.emitClick();
                this.pointerDown = true;
            });
            char.addEventListener("mousemove", (e) => {
                if (this.pointerDown) {
                    this.cursorEnd = index;
                    this.updateSelection();
                }
            });

            char.textContent = chars[i];
            char = current.appendChild(char);
            this.charSpans.push(char);
        }
    }

    // update will update the lines
    private update() {
        let line = 0;
        let text = this.text;
        let chars = text.split("");
        let currentText = "";
        this.charSpans = [];
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