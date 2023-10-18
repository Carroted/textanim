// src/index.ts
var fixTextArea = function() {
  if (textArea.value.length > textArea.maxLength) {
    textArea.value = textArea.value.slice(0, textArea.maxLength);
  }
  let selectionStart = textArea.selectionStart;
  let selectionEnd = textArea.selectionEnd;
  textArea.value = textArea.value.replace(/ /g, "\xA0");
  let targetLength = textArea.rows * textArea.cols;
  while (textArea.value.length < targetLength) {
    textArea.value += "\xA0";
  }
  textArea.selectionStart = selectionStart;
  textArea.selectionEnd = selectionEnd;
};
var sleep = function(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var stop = function() {
  stopped = true;
};
async function play() {
  stopped = false;
  textArea.disabled = true;
  let prevTextAreaDisplay = prevTextArea.style.display;
  prevTextArea.style.display = "none";
  let end = () => {
    console.log("Done playing");
    textArea.disabled = false;
    prevTextArea.style.display = prevTextAreaDisplay;
  };
  for (let action of actions) {
    if (stopped) {
      end();
      break;
    }
    if (action.type === "frame") {
      let frame = action;
      textArea.value = frame.text;
      await sleep(100);
    } else if (action.type === "delay") {
      let delay = action;
      await sleep(100 * delay.frames);
    }
  }
  end();
}
var textAreas = document.createElement("div");
textAreas.className = "textareas";
var textArea = document.createElement("textarea");
var prevTextArea = document.createElement("textarea");
prevTextArea.disabled = true;
prevTextArea.className = "previous";
textArea.rows = 3;
prevTextArea.rows = 3;
textArea.cols = 16;
prevTextArea.cols = 16;
textArea.maxLength = textArea.rows * textArea.cols;
textArea = textAreas.appendChild(textArea);
prevTextArea = textAreas.appendChild(prevTextArea);
document.body.appendChild(textAreas);
var actions = [];
textArea.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    fixTextArea();
    actions.push({
      type: "frame",
      text: textArea.value
    });
    console.log("new action length is", actions.length);
    prevTextArea.value = textArea.value;
    textArea.value = "";
    e.preventDefault();
  } else if (e.key === "Enter") {
    let colLength = textArea.cols;
    let selectionStart = textArea.selectionStart + colLength;
    selectionStart -= selectionStart % colLength;
    textArea.selectionStart = selectionStart;
    textArea.selectionEnd = selectionStart;
    e.preventDefault();
  } else if ((e.key.length === 1 || e.key === "Space") && !e.ctrlKey && !e.altKey && !e.metaKey) {
    let selectionEnd = textArea.selectionEnd;
    textArea.value = textArea.value.slice(0, textArea.selectionStart) + e.key + textArea.value.slice(textArea.selectionEnd + 1);
    e.preventDefault();
    textArea.selectionStart = selectionEnd + 1;
    textArea.selectionEnd = selectionEnd + 1;
  }
  fixTextArea();
});
var addRow = document.createElement("button");
addRow.innerHTML = "Add row";
addRow.addEventListener("click", () => {
  textArea.rows++;
  textArea.maxLength = textArea.rows * textArea.cols;
  prevTextArea.rows = textArea.rows;
  fixTextArea();
});
var removeRow = document.createElement("button");
removeRow.innerHTML = "Remove row";
removeRow.addEventListener("click", () => {
  if (textArea.rows > 1) {
    textArea.rows--;
    prevTextArea.rows = textArea.rows;
    fixTextArea();
  }
});
var addColumn = document.createElement("button");
addColumn.innerHTML = "Add column";
addColumn.addEventListener("click", () => {
  let oldCols = textArea.cols;
  textArea.cols++;
  prevTextArea.cols = textArea.cols;
  fixTextArea();
});
var removeColumn = document.createElement("button");
removeColumn.innerHTML = "Remove column";
removeColumn.addEventListener("click", () => {
  if (textArea.cols > 1) {
    textArea.cols--;
    prevTextArea.cols = textArea.cols;
    fixTextArea();
  }
});
document.body.appendChild(addRow);
document.body.appendChild(removeRow);
document.body.appendChild(addColumn);
document.body.appendChild(removeColumn);
var stopped = false;
window.play = play;
window.stop = stop;
var playButton = document.createElement("button");
playButton.className = "play";
playButton.innerHTML = "Play";
playButton.addEventListener("click", (e) => {
  play();
});
document.body.appendChild(playButton);
var stopButton = document.createElement("button");
stopButton.className = "stop";
stopButton.innerHTML = "Stop";
stopButton.addEventListener("click", (e) => {
  stop();
});
document.body.appendChild(stopButton);
