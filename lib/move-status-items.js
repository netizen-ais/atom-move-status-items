'use babel';
import SubAtom from 'sub-atom';
import $ from 'jquery';

var config = {};

var disposables;

function activate() {
  disposables = new SubAtom();
}

function deactivate() {
  disposables.dispose();
  disposables = null;
}

// use consumeStatusBar as a trigger that
// the status-bar package has been activated
function consumeStatusBar() {
  disposables.add('status-bar [class*="status-bar-"]', 'mousedown', '> *', dragStart);
}

var dragDisposable;

function dragStart(event) {
  var currentItem = event.currentTarget;
  dragDisposable = new SubAtom();
  dragDisposable.add(document.body, 'mousemove', function(event) {
    drag(currentItem, event);
  });
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

function dragEnd(event) {
  dragDisposable.dispose();
  dragDisposable = null;
}

export {config, activate, deactivate, consumeStatusBar};
