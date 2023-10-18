// welcome to textanim, webapp for making and viewing text animations

let textAreas = document.createElement('div');
textAreas.className = 'textareas';

let textArea = document.createElement('textarea');
// for onion skin
let prevTextArea = document.createElement('textarea');
prevTextArea.disabled = true;
prevTextArea.className = 'previous';

textArea.rows = 3;
prevTextArea.rows = 3;
textArea.cols = 16;
prevTextArea.cols = 16;
// set max length to rows * cols
textArea.maxLength = textArea.rows * textArea.cols;

textArea = textAreas.appendChild(textArea);
prevTextArea = textAreas.appendChild(prevTextArea);
document.body.appendChild(textAreas);

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

let actions: Action[] = [];

textArea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        fixTextArea();
        actions.push({
            type: 'frame',
            text: textArea.value
        } as Frame);
        console.log('new action length is', actions.length);
        prevTextArea.value = textArea.value;
        textArea.value = '';
        e.preventDefault();
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
    }

    fixTextArea();
});

function fixTextArea() {
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
    fixTextArea();
});

let removeRow = document.createElement('button');
removeRow.innerHTML = 'Remove row';
removeRow.addEventListener('click', () => {
    if (textArea.rows > 1) {
        textArea.rows--; // Decrease the number of visible rows
        prevTextArea.rows = textArea.rows;
        fixTextArea();
    }
});

let addColumn = document.createElement('button');
addColumn.innerHTML = 'Add column';
addColumn.addEventListener('click', () => {
    let oldCols = textArea.cols;
    textArea.cols++; // Increase the number of visible columns
    prevTextArea.cols = textArea.cols;
    fixTextArea();
});

let removeColumn = document.createElement('button');
removeColumn.innerHTML = 'Remove column';
removeColumn.addEventListener('click', () => {
    if (textArea.cols > 1) {
        textArea.cols--; // Decrease the number of visible columns
        prevTextArea.cols = textArea.cols;
        fixTextArea();
    }
});

document.body.appendChild(addRow);
document.body.appendChild(removeRow);
document.body.appendChild(addColumn);
document.body.appendChild(removeColumn);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let stopped = false;

function stop() {
    stopped = true;
}

async function play() {
    stopped = false;
    textArea.disabled = true;
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
            await sleep(100);
        }
        else if (action.type === 'delay') {
            let delay = action as Delay;
            await sleep(100 * delay.frames);
        }
    }
    console.log('Done playing');
    textArea.disabled = false;
    prevTextArea.style.display = prevTextAreaDisplay;
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
document.body.appendChild(playButton);

// stop button
let stopButton = document.createElement('button');
stopButton.className = 'stop';
stopButton.innerHTML = 'Stop';
stopButton.addEventListener('click', (e) => {
    stop();
});
document.body.appendChild(stopButton);