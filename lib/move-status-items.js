'use babel';
import fs from 'fs';
import path from 'path';
import SubAtom from 'sub-atom';
import $ from 'jquery';

// css classes on the status items that we don't want
// to be serialized
const genericCSSClasses = /inline-block/i

const configPath = path.join(path.dirname(atom.config.getUserConfigPath()), 'move-status-items.json');

var disposables;

export function activate() {
  disposables = new SubAtom();
  atom.packages.onDidActivateInitialPackages(function() {
    setInitialOrder();
    handleEvents();
  });
}

export function deactivate() {
  disposables.dispose();
  [disposables, serializedState] = [];
}

function handleEvents() {
  disposables.add('status-bar [class*="status-bar-"]', 'mousedown', '> *', dragStart);
}

var dragDisposable;

function dragStart(event) {
  var currentItem = event.currentTarget;
  dragDisposable = new SubAtom();
  dragDisposable.add(document.body, 'mousemove', (event) => drag(currentItem, event));
  dragDisposable.add(document.body, 'mouseup mouseleave', dragEnd);
}

function drag(currentItem, event) {
  var {pageX} = event;
  var nextItem = getNextItem(currentItem);
  var previousItem = getNextItem(currentItem, true);
  if(previousItem && pageX < $(previousItem).offset().left + previousItem.clientWidth / 2) {
    $(currentItem).insertBefore(previousItem);
  } else if(nextItem && pageX > $(nextItem).offset().left + nextItem.clientWidth / 2) {
    $(currentItem).insertAfter(nextItem);
  }
}

function dragEnd(event) {
  dragDisposable.dispose();
  dragDisposable = null;
  saveOrder();
}

function getNextItem(currentItem, reverse = false) {
  var parent = currentItem.parentNode;
  var currentIndex = Array.prototype.indexOf.call(parent.children, currentItem);
  while(currentIndex > 0 && currentIndex < parent.children.length - 1) {
    currentIndex += Math.pow(-1, reverse);
    let item = parent.children[currentIndex];
    if(isVisible(item)) return item;
  }
}

function isVisible(element) {
  var {display, visibility, width} = window.getComputedStyle(element);
  width = width ? parseInt(width) : element.clientWidth;
  return display != 'none' && visibility != 'hidden' && width > 0;
}

function saveOrder() {
  var serializedState = {};
  for(let side of ['left', 'right']) {
    serializedState[side] = [];
    let statusItems = document.querySelectorAll(`status-bar .status-bar-${side} > *`);
    for(let i in statusItems) {
      if(statusItems[i] instanceof HTMLElement) serializedState[side].push(serializeStatusItem(statusItems[i]));
    }
  }
  fs.writeFileSync(configPath, JSON.stringify(serializedState));
  return serializedState;
}

function serializeStatusItem(statusItem) {
  var serializedStatusItem = statusItem.tagName.toLowerCase();
  if(statusItem.className) {
    for(let className of statusItem.className.split(' ')) {
      if(className.match(/inline-block/)) continue;
      serializedStatusItem += `.${className}`;
    }
  }
  var isAttr = statusItem.getAttribute('is');
  if(isAttr) serializedStatusItem += `[is="${isAttr}"]`;
  return serializedStatusItem;
}

function setInitialOrder() {
  fs.readFile(configPath, 'utf8', function(err, serializedState) {
    serializedState = JSON.parse(serializedState);
    for(let side in serializedState) {
      let statusItemContainer = document.querySelector(`status-bar .status-bar-${side}`);
      for(let serializedStatusItem of serializedState[side]) {
        let statusItem = statusItemContainer.querySelector(serializedStatusItem);
        statusItemContainer.appendChild(statusItem);
      }
    }
  });
}
