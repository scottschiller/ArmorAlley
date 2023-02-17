const utils = {

  array: {

    compare: (property) => {

      let result;

      return (a, b) => {
        if (a[property] < b[property]) {
          result = -1;
        } else if (a[property] > b[property]) {
          result = 1;
        } else {
          result = 0;
        }
        return result;
      };

    },

    shuffle: (array) => {

      // Fisher-Yates shuffle algo

      let i, j, temp;

      for (i = array.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }

      return array;

    }

  },

  css: {

    has: (o, cStr) => {

      // modern
      if (o?.classList) {
        return o.classList.contains(cStr);
      }
      // legacy
      return o.className !== undefined ? new RegExp(`(^|\\s)${cStr}(\\s|$)`).test(o.className) : false;

    },

    add: (o, ...toAdd) => o?.classList?.add(...toAdd),

    remove: (o, ...toRemove) => o?.classList?.remove(...toRemove),

    addOrRemove: (o, conditionToAdd, ...classNames) => {
        utils.css[conditionToAdd ? 'add' : 'remove'](o, ...classNames);
    },

    swap: (o, c1, c2) => {

      o?.classList?.remove(c1);
      o?.classList?.add(c2);

    }

  },

  events: {

    add: (o, evtName, evtHandler) => o.addEventListener(evtName, evtHandler, false),

    remove: (o, evtName, evtHandler) => o.removeEventListener(evtName, evtHandler, false),

    preventDefault: e => e.preventDefault()

  },

  storage: (() => {

    let data = {}, localStorage;

    // try ... catch because even referencing localStorage can cause a security exception.
    // this handles cases like incognito windows, privacy stuff, and "cookies disabled" in Firefox.

    try {
      localStorage = window.localStorage || null;
    } catch (e) {
      console.info('localStorage not accessible, likely denied. Game options will not be saved.');
      localStorage = null;
    }

    function get(name) {

      if (!localStorage) return undefined;

      try {
        data[name] = localStorage.getItem(name);
      } catch (ignore) {
        // oh well
      }

      return data[name];

    }

    function set(name, value) {

      data[name] = value;

      if (!localStorage) return undefined;

      try {
        localStorage.setItem(name, value);
      } catch (err) {
        // oh well
        return false;
      }

      return true;

    }

    function remove(name) {

      data[name] = null;

      if (localStorage) {
        try {
          localStorage.removeItem(name);
        } catch (ignore) {
          // oh well
        }
      }

    }

    // sanity check: try to read a value.
    try {
      get('testLocalStorage');
    } catch (e) {
      console.log('localStorage read test failed. Disabling.');
      localStorage = null;
    }

    return {
      get,
      remove,
      set
    };

  })()

}

export { utils };