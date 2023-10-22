// welcome to textanim, webapp for making and viewing text animations

import TextArea from "./textarea"; // we use this for all text areas, including readonly ones for preview

let page = document.createElement('div');
page.className = 'page';
page = document.body.appendChild(page);

let frameListFrames: HTMLDivElement[] = [];

let rows = 5;
let cols = 37;

let frameDelay = 100;

let startingTextLines = ["  \\(^-^) welcome", "  - Type in the text area", "  - Tab on text area for next frame", "  - Create sprites in Library", "    for quick drawing"];
// create starting text, we pad each line to reach cols
let startingText = startingTextLines.map((line) => {
    let length = line.length;
    while (length < cols) {
        line += ' ';
        length++;
    }
    return line;
}).join('');

let settingsArea = document.createElement('div');
settingsArea.className = 'settings';
settingsArea = page.appendChild(settingsArea);

// push h1 that says settings
let settingsTitle = document.createElement('h1');
settingsTitle.innerHTML = 'Settings';
settingsArea.appendChild(settingsTitle);

let editorArea = document.createElement('div');
editorArea.className = 'editor';
editorArea = page.appendChild(editorArea);

let textAreas = document.createElement('div');
textAreas.className = 'textareas';
textAreas = editorArea.appendChild(textAreas);

let currentFrameDiv = document.createElement("div");
currentFrameDiv.className = 'main';
currentFrameDiv = textAreas.appendChild(currentFrameDiv);

let previousFrameDiv = document.createElement("div");
previousFrameDiv.className = 'previous';
previousFrameDiv = textAreas.appendChild(previousFrameDiv);

let previewFrameDiv = document.createElement("div");
previewFrameDiv.className = 'preview';
previewFrameDiv = textAreas.appendChild(previewFrameDiv);

let currentFrame = new TextArea(currentFrameDiv, rows, cols, startingText);
let previousFrame = new TextArea(previousFrameDiv, rows, cols, "");
previousFrame.readOnly = true;
let previewFrame = new TextArea(previewFrameDiv, rows, cols, "");
previewFrame.readOnly = true;
previewFrameDiv.style.display = 'none';

function setRowsCols() {
    currentFrame.rows = rows;
    currentFrame.cols = cols;
    previousFrame.rows = rows;
    previousFrame.cols = cols;
    previewFrame.rows = rows;
    previewFrame.cols = cols;
}

setRowsCols();

let frameList = document.createElement('div');
frameList.className = 'frame-list';
frameList = page.appendChild(frameList);

// checkbox
let newFromCurrent = document.createElement('input');
newFromCurrent.type = 'checkbox';
newFromCurrent.checked = true;
// label
let newFromCurrentLabel = document.createElement('label');
newFromCurrentLabel.innerHTML = 'New frame from current';
newFromCurrentLabel.appendChild(newFromCurrent);
settingsArea.appendChild(newFromCurrentLabel);

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
settingsArea.appendChild(framerateLabel);

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

function updateShownFrame(index: number) {
    let frame = actions[index] as Frame;
    currentFrame.value = frame.text;
    if (index > 0) {
        let prevAction = actions[index - 1];
        if (prevAction.type === 'frame') {
            previousFrame.value = (prevAction as Frame).text;
        } else {
            previousFrame.value = '';
        }
    } else {
        previousFrame.value = '';
    }
}

function renderAction(i: number) {
    let action = actions[i];
    let item = document.createElement('div');
    item.className = 'item' + (i === editingFrameIndex ? ' active' : '');
    let number = document.createElement('div');
    number.className = 'number';
    number.innerHTML = (i + 1).toString();
    item.appendChild(number);
    if (action.type === 'frame') {
        let frame = action as Frame;
        let frameReplicaDiv = document.createElement('div');
        frameReplicaDiv.className = 'frame-replica';
        frameReplicaDiv = item.appendChild(frameReplicaDiv);
        let frameReplica = new TextArea(frameReplicaDiv, rows, cols, frame.text);
        frameReplica.readOnly = true;
        frameReplica.onClick(() => {
            console.log('clicked replica');
            editingFrameIndex = i;
            updateShownFrame(editingFrameIndex);
            renderActions();
            currentFrameDiv.focus();
        });
        // on hover, show it until blur of list
        frameReplicaDiv.addEventListener('mouseover', (e) => {
            if (i === editingFrameIndex) {
                previewFrameDiv.style.display = 'none';
            } else {
                previewFrame.rows = rows;
                previewFrame.cols = cols;
                previewFrame.value = frame.text;
                previewFrameDiv.style.display = 'block';
            }
        });
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

    let buttons = document.createElement('div');
    buttons.className = 'buttons';
    item.appendChild(buttons);

    let clone = document.createElement('button');
    clone.innerHTML = 'Clone';
    clone.addEventListener('click', (e) => {
        actions.splice(i, 0, JSON.parse(JSON.stringify(actions[i])));
        renderActions();
        updateShownFrame(editingFrameIndex);
    });
    buttons.appendChild(clone);
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
    buttons.appendChild(remove);
    return item;
}

function renderActions() {
    frameList.innerHTML = '';
    frameListFrames = [];
    let actionLength = actions.length;
    for (let i = 0; i < actionLength; i++) {
        let item = renderAction(i);
        frameListFrames.push(frameList.appendChild(item));
    }

    // new frame button
    let newFrame = document.createElement('button');
    newFrame.innerHTML = 'New frame';
    newFrame.addEventListener('click', (e) => {
        editingFrameIndex = actions.length;
        actions.push({
            type: 'frame',
            text: newFromCurrent.checked ? currentFrame.value : ''
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
function updateAction(index: number) {
    // replace child
    if (frameListFrames[index]) {
        frameListFrames[index].innerHTML = renderAction(index).innerHTML;
    }
    else {
        renderActions();
    }
}
frameList.addEventListener('mouseleave', (e) => {
    previewFrameDiv.style.display = 'none';
});
currentFrame.onKeyDown((e) => {
    // this is just tab override
    if (e.key === 'Tab') {
        e.preventDefault();
        let mustScroll = false;
        if (editingFrameIndex === actions.length - 1) {
            actions.push({
                type: 'frame',
                text: newFromCurrent.checked ? currentFrame.value : ''
            } as Frame);
            mustScroll = true;
        }
        editingFrameIndex++;
        updateShownFrame(editingFrameIndex);
        renderActions();
        // scroll to bottom if we added a new frame
        if (mustScroll) {
            frameList.scrollTop = frameList.scrollHeight;
        }
        return "ignore"; // prevent default tab behavior
    } else if (e.key === 'Enter') {
        e.preventDefault();
        let colLength = currentFrame.cols;
        // add colLength to our selection pos, then move to start of new row we are on
        let cursor = currentFrame.cursorPos + colLength;
        cursor -= cursor % colLength;
        currentFrame.cursorPos = cursor;
        return "ignore"; // prevent default enter behavior
    }
    return "normal";
});

function updateEditing() {
    actions[editingFrameIndex] = {
        type: 'frame',
        text: currentFrame.value
    } as Frame;
    updateAction(editingFrameIndex);
}

currentFrame.onValueChanged(() => {
    updateEditing();
});

// add buttons to resize text area
let addRow = document.createElement('button');
addRow.innerHTML = 'Add row';
addRow.addEventListener('click', () => {
    rows++; // Increase the number of visible rows
    setRowsCols();
    renderActions();
});

let removeRow = document.createElement('button');
removeRow.innerHTML = 'Remove row';
removeRow.addEventListener('click', () => {
    if (rows > 1) {
        rows--;
        setRowsCols();
        renderActions();
    }
});

let addColumn = document.createElement('button');
addColumn.innerHTML = 'Add column';
addColumn.addEventListener('click', () => {
    cols++;
    setRowsCols();
    renderActions();
});

let removeColumn = document.createElement('button');
removeColumn.innerHTML = 'Remove column';
removeColumn.addEventListener('click', () => {
    if (cols > 1) {
        cols--; // Decrease the number of visible columns
        setRowsCols();
        renderActions();
    }
});

settingsArea.appendChild(addRow);
settingsArea.appendChild(removeRow);
settingsArea.appendChild(addColumn);
settingsArea.appendChild(removeColumn);

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
    currentFrame.readOnly = true;
    oldEditingFrameIndex = editingFrameIndex;
    editingFrameIndex = 0;
    renderActions();
    let previousFrameDisplay = previousFrameDiv.style.display;
    previousFrameDiv.style.display = 'none';
    // loop through actions
    for (let action of actions) {
        if (stopped) {
            break;
        }

        if (action.type === 'frame') {
            let frame = action as Frame;
            currentFrame.value = frame.text;
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
    currentFrame.readOnly = false;
    previousFrameDiv.style.display = previousFrameDisplay;
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
settingsArea.appendChild(playButton);

// stop button
let stopButton = document.createElement('button');
stopButton.className = 'stop';
stopButton.innerHTML = 'Stop';
stopButton.addEventListener('click', (e) => {
    stop();
});
settingsArea.appendChild(stopButton);

// push h1 to settingsarea that says Library
let libraryTitle = document.createElement('h1');
libraryTitle.innerHTML = 'Library';
settingsArea.appendChild(libraryTitle);

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
    result += '@screenwidth ' + cols + '\n';
    result += '@screenheight ' + rows + '\n\n';
    for (let action of actions) {
        if (action.type === 'frame') {
            // split into lines based on cols, itll look better
            let lines: string[] = [];
            let frame = action as Frame;
            let text = frame.text;
            let length = text.length;
            for (let i = 0; i < length; i += cols) {
                lines.push(text.slice(i, i + cols));
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
                let frame = sectionText.split('\n').join('');
                if (frame.length > (screenwidth * screenheight)) {
                    frame = frame.slice(0, screenwidth * screenheight);
                }
                // replace space with nbsp (' ')
                frame = frame.replace(/ /g, ' ');
                frame = frame.replace(/\n/g, '');
                // pad with spaces until it reaches rows * cols
                let targetLength = screenwidth * screenheight;
                while (frame.length < targetLength) {
                    frame += ' ';
                }
                if (frame.length > screenwidth * screenheight) {
                    frame = frame.slice(0, screenwidth * screenheight);
                }
                actions.push({
                    type: 'frame',
                    text: frame
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
                console.log(screenwidth);
            }
            else if (section === 'screenheight') {
                screenheight = parseInt(sectionText.trim());
                console.log(screenheight);
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
    rows = parsed.screenheight;
    cols = parsed.screenwidth;
    setRowsCols();
    actions = parsed.actions;
    renderActions();
    updateShownFrame(editingFrameIndex);
};