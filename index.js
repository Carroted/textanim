// src/textarea.ts
class TextArea {
  parent;
  lines;
  isReadOnly = false;
  text = "";
  columnCount = 16;
  rowCount = 3;
  cursor = 0;
  cursorEnd = 0;
  cursorVisible = false;
  pointerDown = false;
  charSpans = [];
  valueChangedListeners = [];
  onValueChanged(listener) {
    this.valueChangedListeners.push(listener);
  }
  offValueChanged(listener) {
    this.valueChangedListeners = this.valueChangedListeners.filter((l) => l != listener);
  }
  emitValueChanged() {
    this.valueChangedListeners.forEach((l) => l());
  }
  clickListeners = [];
  onClick(listener) {
    this.clickListeners.push(listener);
  }
  offClick(listener) {
    this.clickListeners = this.clickListeners.filter((l) => l != listener);
  }
  emitClick() {
    this.clickListeners.forEach((l) => l());
  }
  keyDownListeners = [];
  onKeyDown(listener) {
    this.keyDownListeners.push(listener);
  }
  offKeyDown(listener) {
    this.keyDownListeners = this.keyDownListeners.filter((l) => l != listener);
  }
  copyListeners = [];
  onCopy(listener) {
    this.copyListeners.push(listener);
  }
  offCopy(listener) {
    this.copyListeners = this.copyListeners.filter((l) => l != listener);
  }
  indexToXY(index) {
    return [index % this.columnCount, Math.floor(index / this.columnCount)];
  }
  get readOnly() {
    return this.isReadOnly;
  }
  set readOnly(value) {
    this.isReadOnly = value;
    this.parent.tabIndex = value ? -1 : 0;
    this.update();
    if (this.parent == document.activeElement) {
      this.parent.blur();
    }
  }
  charPressed(key) {
    let text = this.text;
    let chars = text.padEnd(this.columnCount * this.rowCount, "\xA0").split("");
    if (this.cursor == this.cursorEnd) {
      chars[this.cursor] = key;
      this.cursorEnd++;
    } else {
      let textLength = chars.length;
      for (let i = 0;i < textLength; i++) {
        if (this.isSelected(i)) {
          chars[i] = key;
        }
      }
    }
    this.text = chars.join("").replace(/ /g, "\xA0");
    if (this.text.length > this.columnCount * this.rowCount) {
      this.text = this.text.substring(0, this.columnCount * this.rowCount);
    }
    this.cursor = this.cursorEnd;
    if (this.cursor >= this.text.length - 1) {
      this.cursor = this.text.length - 1;
    }
    this.cursorEnd = this.cursor;
    this.update();
    this.emitValueChanged();
  }
  pasteText(pasteText) {
    let text = this.text;
    let chars = text.padEnd(this.columnCount * this.rowCount, "\xA0").split("");
    pasteText = pasteText.replace(/ /g, "\xA0");
    const oldCursor = this.cursor;
    let lineIndex = 0;
    let pastedLength = pasteText.length;
    for (let i = 0;i < pastedLength; i++) {
      if (pasteText[i] == "\n") {
        lineIndex++;
        this.cursor = oldCursor + lineIndex * this.columnCount;
        this.cursorEnd = this.cursor;
        continue;
      }
      chars[this.cursor] = pasteText[i];
      this.cursor++;
    }
    this.text = chars.join("");
    if (this.text.length > this.columnCount * this.rowCount) {
      this.text = this.text.substring(0, this.columnCount * this.rowCount);
    }
    this.cursorEnd = this.cursor;
    this.update();
    this.emitValueChanged();
  }
  constructor(target, rows, cols, value) {
    this.parent = target;
    this.parent.classList.add("textarea");
    this.parent.tabIndex = 0;
    this.lines = [];
    this.rowCount = rows;
    this.columnCount = cols;
    this.text = this.fixString(value);
    this.build();
    this.update();
    this.parent.addEventListener("keydown", (e) => {
      let ignore = false;
      this.keyDownListeners.forEach((l) => {
        if (l(e) === "ignore") {
          ignore = true;
        }
      });
      if (ignore)
        return;
      if (this.isReadOnly)
        return;
      if (e.key.length == 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.charPressed(e.key);
      }
      if (e.key == "ArrowUp") {
        this.cursor -= this.columnCount;
        if (this.cursor < 0) {
          this.cursor = 0;
        }
        this.cursorEnd = this.cursor;
        this.update();
        e.preventDefault();
      }
      if (e.key == "ArrowDown") {
        this.cursor += this.columnCount;
        if (this.cursor >= this.text.length - 1) {
          this.cursor = this.text.length - 1;
        }
        this.cursorEnd = this.cursor;
        this.update();
        e.preventDefault();
      }
      if (e.key == "ArrowLeft") {
        this.cursor--;
        if (this.cursor < 0) {
          this.cursor = 0;
        }
        this.cursorEnd = this.cursor;
        this.update();
        e.preventDefault();
      }
      if (e.key == "ArrowRight") {
        this.cursor++;
        if (this.cursor >= this.text.length - 1) {
          this.cursor = this.text.length - 1;
        }
        this.cursorEnd = this.cursor;
        this.update();
        e.preventDefault();
      }
      if (e.key == "c" && e.ctrlKey) {
        let text = this.text;
        let chars = text.split("");
        let textLength = chars.length;
        let clipboard = "";
        let previousRow = -1;
        for (let i = 0;i < textLength; i++) {
          if (this.isSelected(i)) {
            let row = Math.floor(i / this.columnCount);
            if (row != previousRow) {
              if (previousRow != -1) {
                clipboard += "\n";
              }
              previousRow = row;
            }
            clipboard += chars[i];
          }
        }
        navigator.clipboard.writeText(clipboard);
        this.copyListeners.forEach((l) => l());
      }
      if (e.key == "a" && e.ctrlKey) {
        this.cursor = 0;
        this.cursorEnd = this.text.length - 1;
        this.updateSelection();
        e.preventDefault();
      }
    });
    document.addEventListener("paste", (e) => {
      if (document.activeElement != this.parent)
        return;
      if (this.isReadOnly)
        return;
      let pasteText = e.clipboardData.getData("text/plain");
      this.pasteText(pasteText);
      e.preventDefault();
    });
    this.parent.addEventListener("focus", () => {
      this.cursorVisible = true;
      this.update();
    });
    this.parent.addEventListener("blur", () => {
      this.update();
    });
    document.addEventListener("mouseup", () => {
      this.pointerDown = false;
    });
  }
  fixString(value) {
    value = value.split(" ").join("\xA0").padEnd(this.columnCount * this.rowCount, "\xA0");
    if (value.length > this.columnCount * this.rowCount) {
      value = value.substring(0, this.columnCount * this.rowCount);
    }
    return value;
  }
  get value() {
    return this.text;
  }
  set value(value) {
    this.text = this.fixString(value);
    this.update();
    this.emitValueChanged();
  }
  get cols() {
    return this.columnCount;
  }
  set cols(value) {
    this.columnCount = value;
    this.build();
    this.update();
  }
  get rows() {
    return this.rowCount;
  }
  set rows(value) {
    this.rowCount = value;
    this.build();
    this.update();
  }
  get cursorPos() {
    return this.cursor;
  }
  set cursorPos(value) {
    this.cursor = value;
    if (this.cursor < 0) {
      this.cursor = 0;
    }
    if (this.cursor >= this.text.length - 1) {
      this.cursor = this.text.length - 1;
    }
    this.update();
  }
  get selectionEnd() {
    return this.cursorEnd;
  }
  set selectionEnd(value) {
    this.cursorEnd = value;
    if (this.cursorEnd < 0) {
      this.cursorEnd = 0;
    }
    if (this.cursorEnd >= this.text.length - 1) {
      this.cursorEnd = this.text.length - 1;
    }
    this.update();
  }
  build() {
    this.parent.innerHTML = "";
    this.lines = [];
    this.charSpans = [];
    for (let i = 0;i < this.rowCount; i++) {
      let line = document.createElement("div");
      line.className = "line";
      for (let j = 0;j < this.columnCount; j++) {
        let char = document.createElement("span");
        let index = j + i * this.columnCount;
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
        char.textContent = "\xA0";
        char = line.appendChild(char);
        this.charSpans.push(char);
      }
      this.lines.push(line);
      this.parent.appendChild(line);
    }
  }
  isSelected(index) {
    if (!this.cursorVisible)
      return false;
    let start = this.indexToXY(this.cursor);
    let end = this.indexToXY(this.cursorEnd);
    let current = this.indexToXY(index);
    let minX = Math.min(start[0], end[0]);
    let maxX = Math.max(start[0], end[0]);
    let minY = Math.min(start[1], end[1]);
    let maxY = Math.max(start[1], end[1]);
    if (current[1] >= minY && current[1] <= maxY && current[0] >= minX && current[0] <= maxX) {
      return true;
    }
    return false;
  }
  updateSelection() {
    let length = this.charSpans.length;
    for (let i = 0;i < length; i++) {
      let char = this.charSpans[i];
      if (this.isSelected(i)) {
        char.classList.add("cursor");
      } else {
        char.classList.remove("cursor");
      }
    }
  }
  update() {
    let text = this.text.padEnd(this.columnCount * this.rowCount, "\xA0");
    let chars = text.split("");
    let charLength = this.charSpans.length;
    for (let i = 0;i < charLength; i++) {
      let char = this.charSpans[i];
      char.textContent = chars[i];
      if (this.isSelected(i)) {
        char.classList.add("cursor");
      } else {
        char.classList.remove("cursor");
      }
    }
  }
}
var textarea_default = TextArea;

// src/index.ts
var showToast = function(message, duration = 3000) {
  let toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message;
  toasts.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("fade");
    setTimeout(() => {
      toasts.removeChild(toast);
    }, 1000);
  }, duration);
};
var setRowsCols = function() {
  currentFrame.rows = rows;
  currentFrame.cols = cols;
  previousFrame.rows = rows;
  previousFrame.cols = cols;
  previewFrame.rows = rows;
  previewFrame.cols = cols;
};
var updateShownFrame = function(index) {
  let frame = actions[index];
  currentFrame.value = frame.text;
  if (index > 0) {
    let prevAction = actions[index - 1];
    if (prevAction.type === "frame") {
      previousFrame.value = prevAction.text;
    } else {
      previousFrame.value = "";
    }
  } else {
    previousFrame.value = "";
  }
};
var renderAction = function(i) {
  let action = actions[i];
  let item = document.createElement("div");
  item.className = "item" + (i === editingFrameIndex ? " active" : "");
  let number = document.createElement("div");
  number.className = "number";
  number.innerHTML = (i + 1).toString();
  item.appendChild(number);
  if (action.type === "frame") {
    let frame = action;
    let frameReplicaDiv = document.createElement("div");
    frameReplicaDiv.className = "frame-replica";
    frameReplicaDiv = item.appendChild(frameReplicaDiv);
    let frameReplica = new textarea_default(frameReplicaDiv, rows, cols, frame.text);
    frameReplica.readOnly = true;
    frameReplica.onClick(() => {
      console.log("clicked replica");
      editingFrameIndex = i;
      updateShownFrame(editingFrameIndex);
      renderActions();
      currentFrameDiv.focus();
    });
    frameReplicaDiv.addEventListener("mouseover", (e) => {
      if (i === editingFrameIndex) {
        previewFrameDiv.style.display = "none";
      } else {
        previewFrame.rows = rows;
        previewFrame.cols = cols;
        previewFrame.value = frame.text;
        previewFrameDiv.style.display = "block";
      }
    });
  } else if (action.type === "delay") {
    let delay = action;
    let delayInput = document.createElement("input");
    delayInput.type = "number";
    delayInput.value = delay.frames.toString();
    delayInput.min = "1";
    delayInput.addEventListener("change", (e) => {
      actions[i] = {
        type: "delay",
        frames: parseInt(delayInput.value)
      };
    });
    item.appendChild(delayInput);
  }
  let buttons = document.createElement("div");
  buttons.className = "buttons";
  item.appendChild(buttons);
  let clone = document.createElement("button");
  clone.innerHTML = "Clone";
  clone.addEventListener("click", (e) => {
    actions.splice(i, 0, JSON.parse(JSON.stringify(actions[i])));
    renderActions();
    updateShownFrame(editingFrameIndex);
  });
  buttons.appendChild(clone);
  let remove = document.createElement("button");
  remove.innerHTML = "Remove";
  remove.addEventListener("click", (e) => {
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
};
var renderActions = function() {
  frameList.innerHTML = "";
  frameListFrames = [];
  let actionLength = actions.length;
  for (let i = 0;i < actionLength; i++) {
    let item = renderAction(i);
    frameListFrames.push(frameList.appendChild(item));
  }
  let newFrame = document.createElement("button");
  newFrame.innerHTML = "New frame";
  newFrame.addEventListener("click", (e) => {
    editingFrameIndex = actions.length;
    actions.push({
      type: "frame",
      text: newFromCurrent.checked ? currentFrame.value : ""
    });
    renderActions();
    updateShownFrame(editingFrameIndex);
  });
  frameList.appendChild(newFrame);
  let newDelay = document.createElement("button");
  newDelay.innerHTML = "New delay";
  newDelay.addEventListener("click", (e) => {
    actions.push({
      type: "delay",
      frames: 1
    });
    renderActions();
  });
  frameList.appendChild(newDelay);
};
var updateAction = function(index) {
  if (frameListFrames[index]) {
    frameListFrames[index].innerHTML = renderAction(index).innerHTML;
  } else {
    renderActions();
  }
};
var nextFrame = function() {
  let mustScroll = false;
  if (editingFrameIndex === actions.length - 1) {
    actions.push({
      type: "frame",
      text: newFromCurrent.checked ? currentFrame.value : ""
    });
    mustScroll = true;
  }
  editingFrameIndex++;
  updateShownFrame(editingFrameIndex);
  renderActions();
  if (mustScroll) {
    frameList.scrollTop = frameList.scrollHeight;
  }
};
var prevFrame = function() {
  if (editingFrameIndex > 0) {
    editingFrameIndex--;
    updateShownFrame(editingFrameIndex);
    renderActions();
  }
};
var updateEditing = function() {
  actions[editingFrameIndex] = {
    type: "frame",
    text: currentFrame.value
  };
  updateAction(editingFrameIndex);
};
var sleep = function(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
var stop = function() {
  stopped = true;
  editingFrameIndex = oldEditingFrameIndex;
};
async function play() {
  stopped = false;
  currentFrame.readOnly = true;
  oldEditingFrameIndex = editingFrameIndex;
  editingFrameIndex = 0;
  renderActions();
  let previousFrameDisplay = previousFrameDiv.style.display;
  previousFrameDiv.style.display = "none";
  for (let action of actions) {
    if (stopped) {
      break;
    }
    if (action.type === "frame") {
      let frame = action;
      currentFrame.value = frame.text;
      await sleep(frameDelay);
    } else if (action.type === "delay") {
      let delay = action;
      await sleep(frameDelay * delay.frames);
    }
    editingFrameIndex++;
    renderActions();
  }
  console.log("Done playing");
  currentFrame.readOnly = false;
  previousFrameDiv.style.display = previousFrameDisplay;
  editingFrameIndex = oldEditingFrameIndex;
  renderActions();
}
var actionsToString = function() {
  let result = "";
  result += "@framerate " + frameDelay + "\n";
  result += "@screenwidth " + cols + "\n";
  result += "@screenheight " + rows + "\n\n";
  for (let action of actions) {
    if (action.type === "frame") {
      let lines = [];
      let frame = action;
      let text = frame.text;
      let length = text.length;
      for (let i = 0;i < length; i += cols) {
        lines.push(text.slice(i, i + cols));
      }
      result += "@frame\n" + lines.join("\n") + "\n\n";
    } else if (action.type === "delay") {
      result += "@delay " + action.frames + "\n\n";
    }
  }
  return result;
};
var stringToActions = function(str) {
  let lines = str.split("\n");
  let length = lines.length;
  let i = 0;
  let framerate = 100;
  let screenwidth = 16;
  let screenheight = 3;
  let actions = [];
  let section = null;
  let sectionText = "";
  function sectionHandler() {
    if (section !== null) {
      if (section === "frame") {
        let frame = sectionText.split("\n").join("");
        if (frame.length > screenwidth * screenheight) {
          frame = frame.slice(0, screenwidth * screenheight);
        }
        frame = frame.replace(/ /g, "\xA0");
        frame = frame.replace(/\n/g, "");
        let targetLength = screenwidth * screenheight;
        while (frame.length < targetLength) {
          frame += "\xA0";
        }
        if (frame.length > screenwidth * screenheight) {
          frame = frame.slice(0, screenwidth * screenheight);
        }
        actions.push({
          type: "frame",
          text: frame
        });
      } else if (section === "delay") {
        actions.push({
          type: "delay",
          frames: parseInt(sectionText.trim())
        });
      } else if (section === "framerate") {
        framerate = parseInt(sectionText.trim());
      } else if (section === "screenwidth") {
        screenwidth = parseInt(sectionText.trim());
        console.log(screenwidth);
      } else if (section === "screenheight") {
        screenheight = parseInt(sectionText.trim());
        console.log(screenheight);
      }
    }
  }
  for (;i < length; i++) {
    let line = lines[i];
    if (line.startsWith("@")) {
      sectionHandler();
      sectionText = "";
      let name = line.slice(1).split(" ")[0];
      section = name;
      line = line.slice(1 + name.length + 1);
    }
    line = line.replace("\\@", "@");
    if (section === null) {
      continue;
    }
    if (line.startsWith("#")) {
      continue;
    }
    line = line.replace("\\#", "#");
    sectionText += line + "\n";
  }
  sectionHandler();
  return {
    framerate,
    screenwidth,
    screenheight,
    actions
  };
};
var toasts = document.getElementById("toasts");
window.showToast = showToast;
var page = document.createElement("div");
page.className = "page";
page = document.body.appendChild(page);
var frameListFrames = [];
var rows = 5;
var cols = 37;
var frameDelay = 100;
var startingTextLines = ["  \\(^-^) welcome", "  - Type in the text area", "  - Tab on text area for next frame", "  - Create sprites in Library", "    for quick drawing"];
var startingText = startingTextLines.map((line) => {
  let length = line.length;
  while (length < cols) {
    line += " ";
    length++;
  }
  return line;
}).join("");
var settingsArea = document.createElement("div");
settingsArea.className = "settings";
settingsArea = page.appendChild(settingsArea);
var settingsTitle = document.createElement("h1");
settingsTitle.innerHTML = "Settings";
settingsArea.appendChild(settingsTitle);
var editorArea = document.createElement("div");
editorArea.className = "editor";
editorArea = page.appendChild(editorArea);
var textAreas = document.createElement("div");
textAreas.className = "textareas";
textAreas = editorArea.appendChild(textAreas);
var currentFrameDiv = document.createElement("div");
currentFrameDiv.className = "main";
currentFrameDiv = textAreas.appendChild(currentFrameDiv);
var previousFrameDiv = document.createElement("div");
previousFrameDiv.className = "previous";
previousFrameDiv = textAreas.appendChild(previousFrameDiv);
var previewFrameDiv = document.createElement("div");
previewFrameDiv.className = "preview";
previewFrameDiv = textAreas.appendChild(previewFrameDiv);
var currentFrame = new textarea_default(currentFrameDiv, rows, cols, startingText);
currentFrame.onCopy(() => {
  showToast("Copied to clipboard");
});
var previousFrame = new textarea_default(previousFrameDiv, rows, cols, "");
previousFrame.readOnly = true;
var previewFrame = new textarea_default(previewFrameDiv, rows, cols, "");
previewFrame.readOnly = true;
previewFrameDiv.style.display = "none";
setRowsCols();
var frameList = document.createElement("div");
frameList.className = "frame-list";
frameList = page.appendChild(frameList);
var newFromCurrent = document.createElement("input");
newFromCurrent.type = "checkbox";
newFromCurrent.checked = true;
var newFromCurrentLabel = document.createElement("label");
newFromCurrentLabel.innerHTML = "New frame from current";
newFromCurrentLabel.appendChild(newFromCurrent);
settingsArea.appendChild(newFromCurrentLabel);
var framerate = document.createElement("input");
framerate.type = "number";
framerate.value = "100";
framerate.min = "1";
framerate.addEventListener("change", (e) => {
  let parsed = parseInt(framerate.value);
  if (isNaN(parsed) || parsed < 1) {
    parsed = 100;
  }
  frameDelay = parsed;
  framerate.value = frameDelay.toString();
});
var framerateLabel = document.createElement("label");
framerateLabel.innerHTML = "Delay between frames (ms)";
framerateLabel.appendChild(framerate);
settingsArea.appendChild(framerateLabel);
var actions = [
  {
    type: "frame",
    text: startingText
  }
];
var editingFrameIndex = 0;
renderActions();
frameList.addEventListener("mouseleave", (e) => {
  previewFrameDiv.style.display = "none";
});
currentFrame.onKeyDown((e) => {
  if (e.key === "Tab" && !e.shiftKey) {
    e.preventDefault();
    nextFrame();
    return "ignore";
  } else if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    prevFrame();
    return "ignore";
  } else if (e.key === "Enter") {
    e.preventDefault();
    let colLength = currentFrame.cols;
    let cursor = currentFrame.cursorPos + colLength;
    cursor -= cursor % colLength;
    currentFrame.cursorPos = cursor;
    return "ignore";
  }
  return "normal";
});
document.addEventListener("keydown", (e) => {
  if (e.key === "PageUp") {
    prevFrame();
    e.preventDefault();
  } else if (e.key === "PageDown") {
    nextFrame();
    e.preventDefault();
  }
});
currentFrame.onValueChanged(() => {
  updateEditing();
});
var addRow = document.createElement("button");
addRow.innerHTML = "Add row";
addRow.addEventListener("click", () => {
  rows++;
  setRowsCols();
  renderActions();
});
var removeRow = document.createElement("button");
removeRow.innerHTML = "Remove row";
removeRow.addEventListener("click", () => {
  if (rows > 1) {
    rows--;
    setRowsCols();
    renderActions();
  }
});
var addColumn = document.createElement("button");
addColumn.innerHTML = "Add column";
addColumn.addEventListener("click", () => {
  cols++;
  setRowsCols();
  renderActions();
});
var removeColumn = document.createElement("button");
removeColumn.innerHTML = "Remove column";
removeColumn.addEventListener("click", () => {
  if (cols > 1) {
    cols--;
    setRowsCols();
    renderActions();
  }
});
settingsArea.appendChild(addRow);
settingsArea.appendChild(removeRow);
settingsArea.appendChild(addColumn);
settingsArea.appendChild(removeColumn);
var stopped = false;
var oldEditingFrameIndex = editingFrameIndex;
window.play = play;
window.stop = stop;
var controlsContainer = document.createElement("div");
controlsContainer.className = "controls-container";
controlsContainer = editorArea.appendChild(controlsContainer);
var controls = document.createElement("div");
controls.className = "controls";
controls = controlsContainer.appendChild(controls);
var playButton = document.createElement("button");
playButton.className = "play";
playButton.innerHTML = '<img src="play.png" alt="Play" class="icon">';
playButton.addEventListener("click", (e) => {
  play();
});
controls.appendChild(playButton);
var stopButton = document.createElement("button");
stopButton.className = "stop";
stopButton.innerHTML = '<img src="stop.png" alt="Stop" class="icon">';
stopButton.addEventListener("click", (e) => {
  stop();
});
controls.appendChild(stopButton);
var paletteTitle = document.createElement("h1");
paletteTitle.innerHTML = "Palette";
settingsArea.appendChild(paletteTitle);
var palette = document.createElement("div");
palette.className = "palette";
palette = settingsArea.appendChild(palette);
var paletteChars = ["\u2588", "\u2593", "\u2592", "\u2591", "\u2580", "\u2584", "\u2590", "\u258C", "\xB4", "\u2022", "\u2581", "\u2583"];
for (let char of paletteChars) {
  let charDiv = document.createElement("div");
  charDiv.className = "char";
  charDiv.innerHTML = char;
  charDiv.addEventListener("click", (e) => {
    currentFrame.charPressed(char);
    currentFrameDiv.focus();
    updateEditing();
  });
  palette.appendChild(charDiv);
}
var libraryTitle = document.createElement("h1");
libraryTitle.innerHTML = "Library";
settingsArea.appendChild(libraryTitle);
var library = document.createElement("div");
library.className = "library";
library = settingsArea.appendChild(library);
var sprites = [
  `\u2581\u2583\u2583\u2581
(\u2022-)`,
  `\u2581\u2583\u2583\u2583\u2581
(\u2022-\u2022)`
];
for (let sprite of sprites) {
  let item = document.createElement("div");
  item.className = "item";
  item.innerHTML = sprite.replace(/\n/g, "<br>");
  item.addEventListener("click", (e) => {
    currentFrame.pasteText(sprite);
    currentFrameDiv.focus();
    updateEditing();
  });
  library.appendChild(item);
}
window.actionsToString = actionsToString;
window.load = (str) => {
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
