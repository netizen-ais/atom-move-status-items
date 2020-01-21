'use babel';
import SubAtom from 'sub-atom';

// css classes on the status items that we don't want
// to be serialized
const ignoredCSSClasses = /(^|\s)\S*(inline-block)\S*/g;

var disposables;

export function activate() {
  disposables = new SubAtom();
  atom.packages.onDidActivateInitialPackages(() => {
    process.nextTick(() => {
      handleEvents();
      setInitialOrder();
    });
  });
}

export function deactivate() {
  disposables.dispose();
  disposables = null;
}

function handleEvents() {
  disposables.add('status-bar', 'mousedown', '.status-bar-left > *, .status-bar-right > *', dragStart);
}

var dragDisposable;

function dragStart(event) {
  if (event.which != 1) return;
  event.preventDefault();
  var currentItem = event.currentTarget;
  dragDisposable = new SubAtom();
  dragDisposable.add(document.body, 'mousemove', mousemoveEvent => drag(currentItem, mousemoveEvent));
  dragDisposable.add(document.body, 'mouseup mouseleave', () => dragEnd(currentItem));
  currentItem.classList.add('dragging');
  document.querySelector('status-bar').classList.add('dragging');
}

function drag(currentItem, event) {
  var {pageX} = event;
  var previousItem = getNextItem(currentItem, true);
  var nextItem = getNextItem(currentItem);
  if (previousItem && pageX < Math.round(previousItem.offsetLeft / 10) * 10 + previousItem.clientWidth) {
    var previousOffset = Math.round(previousItem.offsetLeft / 10) * 10;
    var previousWidth = previousItem.clientWidth;
    if (pageX > previousOffset + previousWidth / 2) {
      previousItem.parentNode.insertBefore(currentItem, previousItem.nextSibling);
    } else {
      previousItem.parentNode.insertBefore(currentItem, previousItem);
    }
  } else if (nextItem && pageX > Math.round(nextItem.offsetLeft / 10 * 10)) {
    var nextOffset = Math.round(nextItem.offsetLeft / 10) * 10;
    var nextWidth = nextItem.clientWidth;
    if (pageX < nextOffset + nextWidth / 2) {
      nextItem.parentNode.insertBefore(currentItem, nextItem);
    } else {
      nextItem.parentNode.insertBefore(currentItem, nextItem.nextSibling);
    }
  }
}

function dragEnd(currentItem) {
  if (dragDisposable) dragDisposable.dispose();
  dragDisposable = null;
  currentItem.classList.remove('dragging');
  document.querySelector('status-bar').classList.remove('dragging');
  saveOrder();
}

function getNextItem(currentItem, reverse = false) {
  var statusItems = document.querySelectorAll('.status-bar-left > *, .status-bar-right > *');
  var currentIndex = Array.prototype.indexOf.call(statusItems, currentItem);
  while (currentIndex >= 0 && currentIndex < statusItems.length) {
    currentIndex += Math.pow(-1, reverse); // -1 if reverse == true, 1 otherwise
    let item = statusItems[currentIndex];
    if (isVisible(item)) return item;
  }
}

function isVisible(el) {
  if (!isHTMLElement(el)) return false;
  var {display, visibility, width} = window.getComputedStyle(el);
  width = parseInt(width) || el.clientWidth;
  return display != 'none' && visibility != 'hidden' && width > 0;
}

function saveOrder() {
  for (let side of ['left', 'right']) {
    let statusItems = document.querySelectorAll(`status-bar .status-bar-${side} > *`);
    atom.config.set(`move-status-items.${side}`, serializeStatusItems(statusItems));
  }
}

function serializeStatusItems(statusItems) {
  return Array.prototype.map.call(statusItems, statusItem => {
    if (!isHTMLElement(statusItem)) return '';
    return serializeStatusItem(statusItem);
  });
}

function serializeStatusItem(statusItem) {
  return statusItem.tagName + serializeClassName(statusItem) + serializeAttribute(statusItem, 'is');
}

function serializeClassName(el) {
  if (!el || !el.className) return '';
  var className = el.className.replace(ignoredCSSClasses, '').trim();
  if (!className) return '';
  return className.replace(/(^|\s+)/g, '.');
}

function serializeAttribute(el, attr) {
  var value = el.getAttribute(attr);
  if (!value) return '';
  return `[${attr}="${value}"]`;
}

function setInitialOrder() {
  var statusBar = document.querySelector('status-bar');
  var config = atom.config.get('move-status-items');
  for (let side in config) {
    if (!config.hasOwnProperty(side)) continue;
    let statusItemContainer = statusBar.querySelector(`.status-bar-${side}`);
    for (let serializedStatusItem of config[side]) {
      let statusItem = statusBar.querySelector(serializedStatusItem);
      if (!isHTMLElement(statusItem)) continue;
      if (statusItemContainer.contains(statusItem)) continue;
      if (statusItem.contains(statusItemContainer)) continue;
      statusItemContainer.appendChild(statusItem);
    }
  }
}

function isHTMLElement(el) {
  return el instanceof HTMLElement;
}
