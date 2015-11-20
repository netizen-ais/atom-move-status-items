'use babel';
import SubAtom from 'sub-atom';
import $ from 'jquery';

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
  if(event.which != 1) return;
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
  if(previousItem && pageX < $(previousItem).offset().left + previousItem.clientWidth) {
    var previousOffset = $(previousItem).offset().left;
    var previousWidth = previousItem.clientWidth;
    if(pageX > previousOffset + previousWidth / 2) {
      $(currentItem).insertAfter(previousItem);
    } else {
      $(currentItem).insertBefore(previousItem);
    }
  } else if(nextItem && pageX > $(nextItem).offset().left) {
    var nextOffset = $(nextItem).offset().left;
    var nextWidth = nextItem.clientWidth;
    if(pageX < nextOffset + nextWidth / 2) {
      $(currentItem).insertBefore(nextItem);
    } else {
      $(currentItem).insertAfter(nextItem);
    }
  }
}

function dragEnd(currentItem) {
  if(dragDisposable) dragDisposable.dispose();
  dragDisposable = null;
  currentItem.classList.remove('dragging');
  document.querySelector('status-bar').classList.remove('dragging');
  saveOrder();
}

function getNextItem(currentItem, reverse = false) {
  var statusItems = document.querySelectorAll('.status-bar-left > *, .status-bar-right > *');
  var currentIndex = Array.prototype.indexOf.call(statusItems, currentItem);
  while(currentIndex >= 0 && currentIndex < statusItems.length) {
    currentIndex += Math.pow(-1, reverse); // -1 if reverse == true, 1 otherwise
    let item = statusItems[currentIndex];
    if(isVisible(item)) return item;
  }
}

function isVisible(el) {
  if(!isHTMLElement(el)) return false;
  var {display, visibility, width} = window.getComputedStyle(el);
  width = parseInt(width) || el.clientWidth;
  return display != 'none' && visibility != 'hidden' && width > 0;
}

function saveOrder() {
  for(let side of ['left', 'right']) {
    let statusItems = document.querySelectorAll(`status-bar .status-bar-${side} > *`);
    var tags = [];
    Array.prototype.map.call(statusItems, statusItem => {
        if(isHTMLElement(statusItem)){
            var tag = {};
            tag.name = statusItem.tagName;

            var attributes = [];
            for (var att, i = 0, atts = statusItem.attributes, n = atts.length; i < n; i++){
                att = atts[i];

                var a = {};
                a.name = att.nodeName;
                a.value = att.nodeValue;
                attributes.push(a);
            }

            tag.attributes = attributes;
            tags.push(tag);
        }
    });

    atom.config.set(`move-status-items.${side}`, tags);
  }
}

function setInitialOrder() {
  var statusBar = document.querySelector('status-bar');
  var config = atom.config.get('move-status-items');
  for(let side in config) {
    if(!config.hasOwnProperty(side)) continue;
    let statusItemContainer = statusBar.querySelector(`.status-bar-${side}`);

    for(let tag of config[side]) {
        var el = document.createElement(tag.name);
        var el_selector = tag.name;
        let statusItem = null;

        for(let attr of tag.attributes){
            el.setAttribute(attr.name,attr.value);
            el_selector += `[${attr.name}="${attr.value}"]`;

            // check by unique id
            if(attr.name == "id"){
                statusItem = statusBar.querySelector(`#${attr.value}`);
                if(isHTMLElement(statusItem)){
                    statusItemContainer.appendChild(statusItem);
                    break;
                }
            }
        }

        if(!isHTMLElement(statusItem)){
            // check by attributes
            statusItem = statusBar.querySelector(el_selector);
            if(isHTMLElement(statusItem)) statusItemContainer.appendChild(statusItem);
            else statusItemContainer.appendChild(el); // we did't found it
        }
    }

  }
}

function isHTMLElement(el) {
  return el instanceof HTMLElement;
}
