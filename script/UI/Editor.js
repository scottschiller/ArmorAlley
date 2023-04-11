import { game } from '../core/Game.js';
import { utils } from '../core/utils.js';
const Editor = () => {

  let css, data, dom, events, exports;

  function initDOM() {

    const oRadarScrubber = document.createElement('div');
    oRadarScrubber.id = 'radar-scrubber';

    dom.oRadarScrubber = document.getElementById('battlefield').appendChild(oRadarScrubber);

  }

  function initEditor() {

    initDOM();

    utils.css.add(document.body, css.editMode);

    events.resize();

  }

  css = {
    editMode: 'edit-mode',
  };

  data = {
  };

  dom = {
    oRadarScrubber: null
  };


  events = {


  };

  exports = {
    data,
    dom,
    events,
    init: initEditor
  };

  return exports;

};

export { Editor };