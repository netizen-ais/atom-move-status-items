'use babel';
import fs from 'fs';
import path from 'path';
import SubAtom from 'sub-atom';
import $ from 'jquery';

// css classes on the status items that we don't want
// to be serialized
const genericCSSClasses = /inline-block|success|error|warning|active|first|last/;

var disposables;

export function activate() {
  disposables = new SubAtom();
  atom.packages.onDidActivateInitialPackages(function init() {
    process.nextTick(function delayedInit() {
      handleEvents();
      setInitialOrder();
    });
  });
}

export function deactivate() {
  disposables.dispose();
  [disposables, serializedState] = [];
}

function handleEvents() {
  disposables.add('status-bar .status-bar-left, status-bar .status-bar-right', 'mousedown', '> *', dragStart);
}

var dragDisposable;

function dragStart(event) {
  var currentItem = event.currentTarget;
  dragDisposable = new SubAtom();
  dragDisposable.add(document.body, 'mousemove', (event) => drag(currentItem, event));
  dragDisposable.add(document.body, 'mouseup mouseleave', () => dragEnd(currentItem));
  currentItem.classList.add('dragging');
  currentItem.parentNode.classList.add('dragging');
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

function dragEnd(currentItem) {
  dragDisposable.dispose();
  dragDisposable = null;
  currentItem.classList.remove('dragging');
  currentItem.parentNode.classList.remove('dragging');
  saveOrder();
}

function getNextItem(currentItem, reverse = false) {
  var parent = currentItem.parentNode;
  var currentIndex = Array.prototype.indexOf.call(parent.children, currentItem);
  while(currentIndex >= 0 && currentIndex <= parent.children.length - 1) {
    currentIndex += Math.pow(-1, reverse); // 1, or -1 if reverse == true
    let item = parent.children[currentIndex];
    if(item && isVisible(item)) return item;
  }
}

function isVisible(element) {
  var {display, visibility, width} = window.getComputedStyle(element);
  width = width ? parseInt(width) : element.clientWidth;
  return display != 'none' && visibility != 'hidden' && width > 0;
}

function saveOrder() {
  for(let side of ['left', 'right']) {
    let statusItems = document.querySelectorAll(`status-bar .status-bar-${side} > *`);
    atom.config.set(`move-status-items.${side}`, serializeStatusItems(statusItems));
  }
}

function serializeStatusItems(statusItems) {
  return Array.prototype.map.call(statusItems, function(statusItem) {
    if(!isHTMLElement(statusItem)) return '';
    return serializeStatusItem(statusItem);
  });
}

function serializeStatusItem(statusItem) {
  var serializedStatusItem = statusItem.tagName.toLowerCase();
  if(statusItem.className) serializedStatusItem += serializeClassName(statusItem.className);
  var isAttr = statusItem.getAttribute('is');
  if(isAttr) serializedStatusItem += `[is="${isAttr}"]`;
  return serializedStatusItem;
}

function serializeClassName(className) {
  serializedClassName = '';
  for(let classNamePart of className.split(' ')) {
    if(classNamePart.match(genericCSSClasses)) continue;
    serializedClassName += `.${classNamePart}`;
  }
  return serializedClassName;
}

function setInitialOrder() {
  for(let side of ['left', 'right']) {
    let serializedState = atom.config.get(`move-status-items.${side}`);
    if(!serializedState) continue;
    let statusItemContainer = document.querySelector(`status-bar .status-bar-${side}`);
    for(let serializedStatusItem of serializedState) {
      let statusItem = statusItemContainer.querySelector(serializedStatusItem);
      if(!isHTMLElement(statusItem)) continue;
      statusItemContainer.appendChild(statusItem);
    }
  }
}

function isHTMLElement(item) {
  return item instanceof HTMLElement;
}
