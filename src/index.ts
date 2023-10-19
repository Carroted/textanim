// welcome to textanim, webapp for making and viewing text animations

let editorArea = document.createElement('div');
editorArea.className = 'editor';
editorArea = document.body.appendChild(editorArea);

let textAreas = document.createElement('div');
textAreas.className = 'textareas';

let textArea = document.createElement('textarea');
// for onion skin
let prevTextArea = document.createElement('textarea');
let previewTextArea = document.createElement('textarea');
prevTextArea.disabled = true;
prevTextArea.className = 'previous';
previewTextArea.disabled = true;
previewTextArea.className = 'preview';
previewTextArea.style.display = 'none';

textArea.rows = 3;
prevTextArea.rows = 3;
textArea.cols = 16;
prevTextArea.cols = 16;
previewTextArea.rows = 3;
previewTextArea.cols = 16;
// set max length to rows * cols
textArea.maxLength = textArea.rows * textArea.cols;

textArea = textAreas.appendChild(textArea);
prevTextArea = textAreas.appendChild(prevTextArea);
previewTextArea = textAreas.appendChild(previewTextArea);
editorArea.appendChild(textAreas);

let frameList = document.createElement('div');
frameList.className = 'frame-list';
frameList = document.body.appendChild(frameList);

// checkbox
let newFromCurrent = document.createElement('input');
newFromCurrent.type = 'checkbox';
newFromCurrent.checked = true;
// label
let newFromCurrentLabel = document.createElement('label');
newFromCurrentLabel.innerHTML = 'New frame from current';
newFromCurrentLabel.appendChild(newFromCurrent);
editorArea.appendChild(newFromCurrentLabel);

let frameDelay = 100;
let framerate = document.createElement('input');
framerate.type = 'number';
framerate.value = '100';
framerate.min = '1';
framerate.addEventListener('change', (e) => {
    let parsed = parseInt(framerate.value);
    if (isNaN(parsed) || parsed < 1) {
        parsed = 100;
    }
    frameDelay = parsed;
    framerate.value = frameDelay.toString();
});
// label
let framerateLabel = document.createElement('label');
framerateLabel.innerHTML = 'Delay between frames (ms)';
framerateLabel.appendChild(framerate);
editorArea.appendChild(framerateLabel);

interface Action {
    type: 'frame' | 'delay' | 'subtitle';
}

interface Delay extends Action {
    type: 'delay';
    frames: number;
}

interface Frame extends Action {
    text: string;
}

interface Subtitle extends Action {
    text: string;
}

let actions: Action[] = [
    {
        type: 'frame',
        text: ''
    } as Frame
];

let editingFrameIndex: number = 0;

renderActions();
fixTextArea();

function updateShownFrame(index: number) {
    let frame = actions[index] as Frame;
    textArea.value = frame.text;
    if (index > 0) {
        let prevAction = actions[index - 1];
        if (prevAction.type === 'frame') {
            prevTextArea.value = (prevAction as Frame).text;
        } else {
            prevTextArea.value = '';
        }
    } else {
        prevTextArea.value = '';
    }
}

let savedSelectionStart: number | null = null;
let savedSelectionEnd: number | null = null;

function renderActions() {
    frameList.innerHTML = '';
    let actionLength = actions.length;
    for (let i = 0; i < actionLength; i++) {
        let action = actions[i];
        let item = document.createElement('div');
        item.className = 'item' + (i === editingFrameIndex ? ' active' : '');
        let number = document.createElement('div');
        number.className = 'number';
        number.innerHTML = (i + 1).toString();
        item.appendChild(number);
        let clone = document.createElement('button');
        clone.innerHTML = 'Clone';
        clone.addEventListener('click', (e) => {
            actions.splice(i, 0, JSON.parse(JSON.stringify(actions[i])));
            renderActions();
            updateShownFrame(editingFrameIndex);
        });
        item.appendChild(clone);
        if (action.type === 'frame') {
            let frame = action as Frame;
            let frameReplica = document.createElement('textarea');
            frameReplica.className = 'frame-replica';
            frameReplica.readOnly = true;
            frameReplica.value = frame.text;
            frameReplica.rows = textArea.rows;
            frameReplica.cols = textArea.cols;
            frameReplica.addEventListener('click', (e) => {
                console.log('clicked replica');
                editingFrameIndex = i;
                updateShownFrame(editingFrameIndex);
                textArea.disabled = false;
                renderActions();
                textArea.focus();
            });
            // on hover, show it until blur of list
            frameReplica.addEventListener('mouseover', (e) => {
                if (i === editingFrameIndex) {
                    previewTextArea.style.display = 'none';
                } else {
                    previewTextArea.value = frame.text;
                    previewTextArea.rows = textArea.rows;
                    previewTextArea.cols = textArea.cols;
                    previewTextArea.style.display = 'initial';
                }
            });
            item.appendChild(frameReplica);
        }
        else if (action.type === 'delay') {
            let delay = action as Delay;
            let delayInput = document.createElement('input');
            delayInput.type = 'number';
            delayInput.value = delay.frames.toString();
            delayInput.min = '1';
            delayInput.addEventListener('change', (e) => {
                actions[i] = {
                    type: 'delay',
                    frames: parseInt(delayInput.value)
                } as Delay;
            });
            item.appendChild(delayInput);
        }
        let remove = document.createElement('button');
        remove.innerHTML = 'Remove';
        remove.addEventListener('click', (e) => {
            actions.splice(i, 1);
            if (editingFrameIndex >= i) {
                editingFrameIndex--;
            } else if (editingFrameIndex === actions.length) {
                editingFrameIndex--;
            }
            if (editingFrameIndex < 0) {
                editingFrameIndex = 0;
            }

            renderActions();
        });
        item.appendChild(remove);
        frameList.appendChild(item);
    }

    // new frame button
    let newFrame = document.createElement('button');
    newFrame.innerHTML = 'New frame';
    newFrame.addEventListener('click', (e) => {
        editingFrameIndex = actions.length;
        actions.push({
            type: 'frame',
            text: newFromCurrent.checked ? textArea.value : ''
        } as Frame);
        renderActions();
        updateShownFrame(editingFrameIndex);
    });
    frameList.appendChild(newFrame);
    // new delay button
    let newDelay = document.createElement('button');
    newDelay.innerHTML = 'New delay';
    newDelay.addEventListener('click', (e) => {
        actions.push({
            type: 'delay',
            frames: 1
        } as Delay);
        renderActions();
    });
    frameList.appendChild(newDelay);
}
frameList.addEventListener('mouseleave', (e) => {
    previewTextArea.style.display = 'none';
});


textArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        let selectionStart = textArea.selectionStart;
        let selectionEnd = textArea.selectionEnd;
        fixTextArea();
        let mustScroll = false;
        if (editingFrameIndex === actions.length - 1) {
            actions.push({
                type: 'frame',
                text: newFromCurrent.checked ? textArea.value : ''
            } as Frame);
            mustScroll = true;
        }
        editingFrameIndex++;
        updateShownFrame(editingFrameIndex);
        fixTextArea();
        renderActions();
        e.preventDefault();
        textArea.selectionStart = selectionStart;
        textArea.selectionEnd = selectionEnd;
        // scroll to bottom if we added a new frame
        if (mustScroll) {
            frameList.scrollTop = frameList.scrollHeight;
        }
    }
    // if its newline, we will instead jump to next line without inserting newline, no content will be modified
    else if (e.key === 'Enter') {
        let colLength = textArea.cols;
        // add colLength to our selection pos, then move to start of new row we are on
        let selectionStart = textArea.selectionStart + colLength;
        selectionStart -= selectionStart % colLength;
        textArea.selectionStart = selectionStart;
        textArea.selectionEnd = selectionStart;
        e.preventDefault();
    }
    // if about to insert a char, replace instead
    else if ((e.key.length === 1 || e.key === 'Space') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        let selectionEnd = textArea.selectionEnd;
        textArea.value = textArea.value.slice(0, textArea.selectionStart) + e.key + textArea.value.slice(textArea.selectionEnd + 1);
        e.preventDefault();
        // move cursor to end of inserted char
        textArea.selectionStart = selectionEnd + 1;
        textArea.selectionEnd = selectionEnd + 1;
        fixTextArea();
        updateEditing();
    }

    fixTextArea();
});

function updateEditing() {
    actions[editingFrameIndex] = {
        type: 'frame',
        text: textArea.value
    } as Frame;
    renderActions();
}

textArea.addEventListener('input', (e) => {
    fixTextArea();
    updateEditing();
});

function fixTextArea() {
    textArea.maxLength = textArea.rows * textArea.cols;
    // trim to max length
    if (textArea.value.length > textArea.maxLength) {
        textArea.value = textArea.value.slice(0, textArea.maxLength);
    }
    let selectionStart = textArea.selectionStart;
    let selectionEnd = textArea.selectionEnd;
    // replace space with nbsp (' ')
    textArea.value = textArea.value.replace(/ /g, ' ');
    // pad with spaces until it reaches rows * cols
    let targetLength = textArea.rows * textArea.cols;
    while (textArea.value.length < targetLength) {
        textArea.value += ' ';
    }
    if (textArea.value.length > textArea.maxLength) {
        textArea.value = textArea.value.slice(0, textArea.maxLength);
    }
    // restore cursor position
    textArea.selectionStart = selectionStart;
    textArea.selectionEnd = selectionEnd;
}

// add buttons to resize text area
let addRow = document.createElement('button');
addRow.innerHTML = 'Add row';
addRow.addEventListener('click', () => {
    textArea.rows++; // Increase the number of visible rows
    textArea.maxLength = textArea.rows * textArea.cols;
    prevTextArea.rows = textArea.rows;
    previewTextArea.rows = textArea.rows;
    fixTextArea();
    renderActions();
});

let removeRow = document.createElement('button');
removeRow.innerHTML = 'Remove row';
removeRow.addEventListener('click', () => {
    if (textArea.rows > 1) {
        textArea.rows--; // Decrease the number of visible rows
        prevTextArea.rows = textArea.rows;
        previewTextArea.rows = textArea.rows;
        fixTextArea();
        renderActions();
    }
});

let addColumn = document.createElement('button');
addColumn.innerHTML = 'Add column';
addColumn.addEventListener('click', () => {
    let oldCols = textArea.cols;
    textArea.cols++; // Increase the number of visible columns
    prevTextArea.cols = textArea.cols;
    previewTextArea.cols = textArea.cols;
    fixTextArea();
    renderActions();
});

let removeColumn = document.createElement('button');
removeColumn.innerHTML = 'Remove column';
removeColumn.addEventListener('click', () => {
    if (textArea.cols > 1) {
        textArea.cols--; // Decrease the number of visible columns
        prevTextArea.cols = textArea.cols;
        previewTextArea.cols = textArea.cols;
        fixTextArea();
        renderActions();
    }
});

editorArea.appendChild(addRow);
editorArea.appendChild(removeRow);
editorArea.appendChild(addColumn);
editorArea.appendChild(removeColumn);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let stopped = false;
let oldEditingFrameIndex = editingFrameIndex;

function stop() {
    stopped = true;
    editingFrameIndex = oldEditingFrameIndex;
}

async function play() {
    stopped = false;
    textArea.disabled = true;
    oldEditingFrameIndex = editingFrameIndex;
    editingFrameIndex = 0;
    renderActions();
    let prevTextAreaDisplay = prevTextArea.style.display;
    prevTextArea.style.display = 'none';
    // loop through actions
    for (let action of actions) {
        if (stopped) {
            break;
        }

        if (action.type === 'frame') {
            let frame = action as Frame;
            textArea.value = frame.text;
            await sleep(frameDelay);
        }
        else if (action.type === 'delay') {
            let delay = action as Delay;
            await sleep(frameDelay * delay.frames);
        }

        editingFrameIndex++;
        renderActions();
    }
    console.log('Done playing');
    textArea.disabled = false;
    prevTextArea.style.display = prevTextAreaDisplay;
    editingFrameIndex = oldEditingFrameIndex;
    renderActions();
}
// @ts-ignore
window.play = play;
// @ts-ignore
window.stop = stop;

// play button
let playButton = document.createElement('button');
playButton.className = 'play';
playButton.innerHTML = 'Play';
playButton.addEventListener('click', (e) => {
    play();
});
editorArea.appendChild(playButton);

// stop button
let stopButton = document.createElement('button');
stopButton.className = 'stop';
stopButton.innerHTML = 'Stop';
stopButton.addEventListener('click', (e) => {
    stop();
});
editorArea.appendChild(stopButton);

// example:
/* @details
name = "some file"

@framerate 100
@screenwidth 16
@screenheight 3

@frame
--------------------
--------------------
----@---------------

# frames are trimmed and bottom aligned, so this gap does nothing

# delay the next frame by the length of one frame
@delay 1
@frame
--------------------
--------------------
-----@--------------

@frame
--------------------
--------------------
------@------------- */
function actionsToString() {
    let result = '';
    result += '@framerate ' + frameDelay + '\n';
    result += '@screenwidth ' + textArea.cols + '\n';
    result += '@screenheight ' + textArea.rows + '\n\n';
    for (let action of actions) {
        if (action.type === 'frame') {
            // split into lines based on cols, itll look better
            let lines: string[] = [];
            let frame = action as Frame;
            let text = frame.text;
            let length = text.length;
            let colLength = textArea.cols;
            for (let i = 0; i < length; i += colLength) {
                lines.push(text.slice(i, i + colLength));
            }
            result += '@frame\n' + lines.join('\n') + '\n\n';
        }
        else if (action.type === 'delay') {
            result += '@delay ' + (action as Delay).frames + '\n\n';
        }
    }
    return result;
}

function stringToActions(str: string) {
    // note: when we hit an unescaped @ section, name is everything until space, and section continues until next section
    let lines = str.split('\n');
    let length = lines.length;
    let i = 0;
    // we wont handle details section yet
    let framerate = 100;
    let screenwidth = 16;
    let screenheight = 3;
    let actions: Action[] = [];
    let section: string | null = null;
    let sectionText = '';
    function sectionHandler() {
        if (section !== null) {
            if (section === 'frame') {
                actions.push({
                    type: 'frame',
                    text: sectionText.trim()
                } as Frame);
            }
            else if (section === 'delay') {
                actions.push({
                    type: 'delay',
                    frames: parseInt(sectionText.trim())
                } as Delay);
            }
            else if (section === 'framerate') {
                framerate = parseInt(sectionText.trim());
            }
            else if (section === 'screenwidth') {
                screenwidth = parseInt(sectionText.trim());
            }
            else if (section === 'screenheight') {
                screenheight = parseInt(sectionText.trim());
            }
        }
    }
    for (; i < length; i++) {
        let line = lines[i];
        if (line.startsWith('@')) {
            // its the end of a section. before we switch, we need to handle the current section ending
            sectionHandler();
            sectionText = '';

            let name = line.slice(1).split(' ')[0];
            section = name;
            // cut off @, name and the space after it
            line = line.slice(1 + name.length + 1);
        }
        // now we can unescape \@
        line = line.replace('\\@', '@');
        if (section === null) {
            continue;
        }
        // if starts in #, its a comment, ignore it
        if (line.startsWith('#')) {
            continue;
        }
        // now we can unescape \#
        line = line.replace('\\#', '#');
        sectionText += line + '\n';
    }
    // handle last section
    sectionHandler();

    // now we have everything
    return {
        framerate,
        screenwidth,
        screenheight,
        actions
    };
}




// @ts-ignore
window.actionsToString = actionsToString;

// @ts-ignore
window.load = (str: string) => {
    let parsed = stringToActions(str);
    console.log(parsed);
    framerate.value = parsed.framerate.toString();
    textArea.rows = parsed.screenheight;
    textArea.cols = parsed.screenwidth;
    actions = parsed.actions;
    renderActions();
    updateShownFrame(editingFrameIndex);
};