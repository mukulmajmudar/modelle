define([], function()
{
    'use strict';

    /* eslint-disable */
  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // a custom event channel. You may bind a callback to an event with `on` or
  // remove with `off`; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = {};

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Iterates over the standard `event, callback` (as well as the fancy multiple
  // space-separated events `"change blur", callback` and jQuery-style event
  // maps `{event: callback}`).
  var eventsApi = function(iteratee, events, name, callback, opts) {
    var i = 0, names;
    if (name && typeof name === 'object') {
      // Handle event maps.
      if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
      for (names = _.keys(name); i < names.length ; i++) {
        events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
      }
    } else if (name && eventSplitter.test(name)) {
      // Handle space-separated event names by delegating them individually.
      for (names = name.split(eventSplitter); i < names.length; i++) {
        events = iteratee(events, names[i], callback, opts);
      }
    } else {
      // Finally, standard events.
      events = iteratee(events, name, callback, opts);
    }
    return events;
  };

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  Events.on = function(name, callback, context) {
    return internalOn(this, name, callback, context);
  };

  // Guard the `listening` argument from the public API.
  var internalOn = function(obj, name, callback, context, listening) {
    obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
      context: context,
      ctx: obj,
      listening: listening
    });

    if (listening) {
      var listeners = obj._listeners || (obj._listeners = {});
      listeners[listening.id] = listening;
    }

    return obj;
  };

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  Events.listenTo = function(obj, name, callback) {
    if (!obj) return this;
    var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = listeningTo[id];

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      var thisId = this._listenId || (this._listenId = _.uniqueId('l'));
      listening = listeningTo[id] = {obj: obj, objId: id, id: thisId, listeningTo: listeningTo, count: 0};
    }

    // Bind callbacks on obj, and keep track of them on listening.
    internalOn(obj, name, callback, this, listening);
    return this;
  };

  // The reducing API that adds a callback to the `events` object.
  var onApi = function(events, name, callback, options) {
    if (callback) {
      var handlers = events[name] || (events[name] = []);
      var context = options.context, ctx = options.ctx, listening = options.listening;
      if (listening) listening.count++;

      handlers.push({callback: callback, context: context, ctx: context || ctx, listening: listening});
    }
    return events;
  };

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  Events.off = function(name, callback, context) {
    if (!this._events) return this;
    this._events = eventsApi(offApi, this._events, name, callback, {
      context: context,
      listeners: this._listeners
    });
    return this;
  };

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  Events.stopListening = function(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj._listenId] : _.keys(listeningTo);

    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
    }

    return this;
  };

  // The reducing API that removes a callback from the `events` object.
  var offApi = function(events, name, callback, options) {
    if (!events) return;

    var i = 0, listening;
    var context = options.context, listeners = options.listeners;

    // Delete all events listeners and "drop" events.
    if (!name && !callback && !context) {
      var ids = _.keys(listeners);
      for (; i < ids.length; i++) {
        listening = listeners[ids[i]];
        delete listeners[listening.id];
        delete listening.listeningTo[listening.objId];
      }
      return;
    }

    var names = name ? [name] : _.keys(events);
    for (; i < names.length; i++) {
      name = names[i];
      var handlers = events[name];

      // Bail out if there are no events stored.
      if (!handlers) break;

      // Replace events if there are any remaining.  Otherwise, clean up.
      var remaining = [];
      for (var j = 0; j < handlers.length; j++) {
        var handler = handlers[j];
        if (
          callback && callback !== handler.callback &&
            callback !== handler.callback._callback ||
              context && context !== handler.context
        ) {
          remaining.push(handler);
        } else {
          listening = handler.listening;
          if (listening && --listening.count === 0) {
            delete listeners[listening.id];
            delete listening.listeningTo[listening.objId];
          }
        }
      }

      // Update tail event if the list has any events.  Otherwise, clean up.
      if (remaining.length) {
        events[name] = remaining;
      } else {
        delete events[name];
      }
    }
    return events;
  };

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  Events.once = function(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.off, this));
    if (typeof name === 'string' && context == null) callback = void 0;
    return this.on(events, callback, context);
  };

  // Inversion-of-control versions of `once`.
  Events.listenToOnce = function(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, _.bind(this.stopListening, this, obj));
    return this.listenTo(obj, events);
  };

  // Reduces the event callbacks into a map of `{event: onceWrapper}`.
  // `offer` unbinds the `onceWrapper` after it has been called.
  var onceMap = function(map, name, callback, offer) {
    if (callback) {
      var once = map[name] = _.once(function() {
        offer(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
    }
    return map;
  };

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  Events.trigger = function(name) {
    if (!this._events) return this;

    var length = Math.max(0, arguments.length - 1);
    var args = Array(length);
    for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

    eventsApi(triggerApi, this._events, name, void 0, args);
    return this;
  };

  // Handles triggering the appropriate event callbacks.
  var triggerApi = function(objEvents, name, callback, args) {
    if (objEvents) {
      var events = objEvents[name];
      var allEvents = objEvents.all;
      if (events && allEvents) allEvents = allEvents.slice();
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, [name].concat(args));
    }
    return objEvents;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

    /* eslint-enable */

    class FetchError extends Error {}

    class HttpError extends Error
    {
        constructor(response)
        {
            super();
            this.response = response;
        }
    }


    /**
     * Wrapper over fetch() that throws exceptions on errors and parses JSON
     * responses.
     */
    async function fetch2(url, options)
    {
        options = Object.assign(
        {
            acceptableStatusCodes: [],
            parseResponse: true
        }, options);

        let response;
        try
        {
            response = await fetch(url, options);
        }
        catch(e)
        {
            // Handle fetch() network error exception (not 4xx or 5xx response)
            if (e instanceof TypeError && e.message === 'Failed to fetch')
            {
                throw new FetchError();
            }

            // Not fetch() error. Throw the exception again.
            throw e;
        }

        if (response.ok || options.acceptableStatusCodes.includes(response.status))
        {
            if (!options.parseResponse)
            {
                return response;
            }
            const contentType = response.headers.get('Content-Type');
            let parsedResponse;
            if (contentType.indexOf('application/json') === 0)
            {
                parsedResponse = await response.json();
            }
            else
            {
                parsedResponse = await response.text();
            }
            return parsedResponse;
        }    

        throw new HttpError(response);
    }

    class Model
    {
        constructor(attributes)
        {
            Object.assign(this, attributes, Events);
        }


        async getUrl()
        {
            throw new Error('not implemented');
        }


        async getCollectionUrl()
        {
            throw new Error('not implemented');
        }


        getHeaders()
        {
            return {};
        }


        async fetch(attributes)
        {
            let url = await this.getUrl();
            if (typeof url === 'string')
            {
                url = new URL(url);
            }
            if (attributes)
            {
                let attributeModelCreators = this._getAttributeModelCreators();
                for (let attribute of Object.keys(attributeModelCreators))
                {
                    if (!attributes.includes(attribute))
                    {
                        continue;
                    }
                    let modelCreator = attributeModelCreators[attribute];
                    this[attribute] = await modelCreator();
                    attributes.splice(attributes.indexOf(attribute), 1);
                }

                // If all attributes were models, we are done
                if (attributes.length === 0)
                {
                    return this;
                }

                for (let attribute of attributes)
                {
                    url.searchParams.append('attributes', attribute);
                }
            }
            let response = await fetch2(url, {headers: this.getHeaders()});
            Object.assign(this, response);
            this.trigger('changed');
            return this;
        }


        async fetchAttribute(attribute, defaultValue)
        {
            await this.fetch([attribute]);
            return this[attribute] ? this[attribute] : defaultValue;
        }


        async save()
        {
            if (!this.id)
            {
                await this._create();
            }
        }


        async _create()
        {
            let url = this.getCollectionUrl();
            let response = fetch2(url,
            {
                method: 'POST',
                headers: Object.assign(
                {
                    'Content-Type': 'application/json; charset=UTF-8'
                }, this.getHeaders()),
                body: JSON.stringify(this)
            });
            Object.assign(this, response);
            this.trigger('changed');
        }


        _getAttributeModelCreators()
        {
            return {};
        }
    }


    class Collection extends Array
    {
        constructor(...args)
        {
            super(...args);
            Object.assign(this, Events);
        }


        async fetch(urlSearchParams, options)
        {
            options = Object.assign(
            {
                // Caching causes a flash on re-render
                useCache: false
            }, options);

            // Form URL with search params
            let url = await this.getUrl();
            if (!(url instanceof URL))
            {
                url = new URL(url);
            }
            if (urlSearchParams)
            {
                for (let key of Object.keys(urlSearchParams))
                {
                    let value = urlSearchParams[key];
                    if (Array.isArray(value))
                    {
                        for (let v of value)
                        {
                            url.searchParams.append(key, v);
                        }
                    }
                    else
                    {
                        url.searchParams.append(key, value);
                    }
                }
            }

            if (options.useCache)
            {
                // Do actual fetch in background
                setTimeout(() => this._fetch(url, options), 0);

                // Fetch cached items if any
                let cachedValue = await this._readCachedValue(url.toString());
                let parsedValue = JSON.parse(cachedValue);
                if (Array.isArray(parsedValue))
                {
                    for (let itemAttributes of parsedValue)
                    {
                        let item = await this.createItem(itemAttributes);
                        this.push(item);
                    }
                }
            }
            else
            {
                await this._fetch(url, options);
            }
        }


        _readCachedValue(urlString)
        {
            return localStorage.getItem(urlString);
        }


        _writeValueToCache(urlString, value)
        {
            localStorage.setItem(urlString, value);
        }


        async _fetch(url, options)
        {
            let response = await fetch2(url, {headers: this.getHeaders()});
            this.splice(0);
            for (let itemAttributes of response[this.getResponseKey()])
            {
                let item = await this.createItem(itemAttributes);
                this.push(item);
            }
            if (options.useCache)
            {
                const urlString = url.toString();
                let cachedValue = await this._readCachedValue(urlString);
                let jsonStringForCache = JSON.stringify(this);
                let cacheUpdated;
                if (cachedValue !== jsonStringForCache)
                {
                    await this._writeValueToCache(urlString, jsonStringForCache);
                    cacheUpdated = true;
                }
                if (cacheUpdated)
                {
                    this.trigger('changed');
                }
            }
            else
            {
                this.trigger('changed');
            }
        }


        getUrl()
        {
            throw new Error('not implemented');
        }


        getResponseKey()
        {
            throw new Error('not implemented');
        }


        // eslint-disable-next-line
        async createItem(itemAttributes)
        {
            throw new Error('not implemented');
        }


        getHeaders()
        {
            return {};
        }
    }


    /**
     * Wait till the given element is on the DOM.
     */
    async function idleUntilOnDOM(element)
    {
        if (document.body.contains(element))
        {
            return;
        }

        return new Promise(resolve =>
        {
            // Create mutation observer on body element
            let observer = new MutationObserver(function(mutations)
            {
                mutations.forEach(function(mutation)
                {
                    // For each added node
                    for (let node of mutation.addedNodes)
                    {
                        // Check if the node is the element we are 
                        // waiting for
                        if (node === element)
                        {
                            resolve();
                            observer.disconnect();
                            return;
                        }

                        // Check if any of the node's descendants
                        // is the element we are waiting for. This
                        // has to be done manually because only direct
                        // node additions are considered mutations. Even
                        // if the added node is not the element itself, it
                        // might have a descendant that is the element but
                        // for which the mutation will never occur.
                        if (node.querySelectorAll)
                        {
                            let descendantEls = node.querySelectorAll('*');
                            for (let descendantEl of descendantEls)
                            {
                                if (descendantEl === element)
                                {
                                    resolve();
                                    observer.disconnect();
                                    return;
                                }
                            }
                        }
                    }
                });
            });

            observer.observe(document.body,
            {
                childList: true,
                subtree: true
            });
        });
    }


    class Controller
    {
        constructor()
        {
            Object.assign(this, Events,
            {
                actualEventListeners: {}
            });
        }


        /**
         * Initialize the controller. For example, fetch data from a server
         * and fetch an HTML template to render in renderView().
         */
        async initialize()
        {
            // Empty by default
        }


        /**
         * Convenience method for common execution flow.
         */
        async run()
        {
            // Initialize the controller
            await this.initialize();

            // Create the view element
            if (!this.el)
            {
                this.createViewElement();
            }

            // Render view
            await this.renderView();
        }


        createViewElement()
        {
            let element = document.createElement(this.getViewElementTag());
            this.setViewElement(element);
        }


        setViewElement(element)
        {
            const viewElementId = this.getViewElementId();
            if (viewElementId)
            {
                element.id = viewElementId;
            }
            this.el = this.viewElement = element;
            this.qs = this.el.querySelector.bind(this.el);

            // Store reference to controller in element so it can be
            // called back by the mutation observer
            this.el._modelleController = this;

            this.addEventListeners();
        }


        getViewElementTag()
        {
            return 'div';
        }


        getViewElementId()
        {
            return null;
        }


        /**
         * Runs the given function if the view element is currently in the
         * DOM or when it is added to the DOM.
         */
        runWhenViewOnDOM(fn)
        {
            // Schedule callback for when view is added to DOM
            setTimeout(async () =>
            {
                await idleUntilOnDOM(this.el);
                fn();
            }, 1);
        }


        /**
         * Hook for when this controller's view is removed from the DOM.
         * Usually, cleanup() should be called here. But it is not called
         * in this base class to maintain clear separation between controller
         * and view.
         */
        onViewRemovedFromDOM()
        {
            // Empty by default
        }


        cleanup()
        {
            this.stopListening();
            delete this.el._modelleController;
        }


        getEventListeners()
        {
            return {};
        }


        renderView()
        {
            // Empty by default
        }


        addEventListeners()
        {
            this.removeEventListeners();
            let eventListenersMap = this.getEventListeners();
            for (let eventName of Object.keys(eventListenersMap))
            {
                let eventListeners = eventListenersMap[eventName];
                let actualEventListener = event =>
                {
                    for (let selector of Object.keys(eventListeners))
                    {
                        let el;
                        if (selector)
                        {
                            el = event.target.closest(selector);
                        }
                        else
                        {
                            // Empty selector means listen on view element
                            el = this.el;
                        }
                        if (el)
                        {
                            let clonedEvent = Object.assign({}, event,
                            {
                                target: el,
                                stopPropagation: () => event.stopPropagation(),
                                preventDefault: () => event.preventDefault()
                            });
                            let listener = eventListeners[selector];
                            if (typeof listener === 'string')
                            {
                                this[listener](clonedEvent);
                            }
                            else
                            {
                                listener(clonedEvent);
                            }
                            return;
                        }
                    }
                };

                this.el.addEventListener(eventName, actualEventListener);
                this.actualEventListeners[eventName] = actualEventListener;
            }
        }


        removeEventListeners()
        {
            for (let eventName of Object.keys(this.actualEventListeners))
            {
                this.el.removeEventListener(eventName,
                    this.actualEventListeners[eventName]);
            }

            this.actualEventListeners = {};
        }
    }
    Controller.AbortException = class extends Error {};


    let viewElementRemovedObserver = new MutationObserver(async mutations =>
    {
        for (let mutation of mutations)
        {
            for (let node of mutation.removedNodes)
            {
                if (node.querySelectorAll)
                {
                    // Callback on descendant views: this has to be done
                    // manually because only direct node removals are
                    // considered mutations. And even if the removed node is not a
                    // view itself, it might have descendants that are views for
                    // which the mutation will never occur.
                    let promises = [];
                    let descendantEls = node.querySelectorAll('*');
                    /* eslint-disable max-depth */
                    for (let descendantEl of descendantEls)
                    {
                        if (descendantEl._modelleController)
                        {
                            promises.push(descendantEl._modelleController.onViewRemovedFromDOM());
                        }
                    }
                    /* eslint-enable max-depth */
                    await Promise.all(promises);
                }

                // If the removed node is a view itself, call cleanup
                if (node._modelleController)
                {
                    await node._modelleController.onViewRemovedFromDOM();
                }
            }
        }
    });

    viewElementRemovedObserver.observe(document.body,
    {
        childList: true,
        subtree: true
    });


    // https://stackoverflow.com/a/35385518
    function htmlToElement(html)
    {
        let template = document.createElement('template');

        // Never return a text node of whitespace as the result
        html = html.trim();
        template.innerHTML = html;
        return template.content.firstChild;
    }


    // https://stackoverflow.com/a/35385518
    function htmlToElements(html)
    {
        let template = document.createElement('template');
        template.innerHTML = html;
        return template.content.childNodes;
    }


    /**
     * Append a CSS transition to an element instead of overwriting the
     * current value. This is useful if multiple CSS transitions are needed
     * simultaneously but you can't manage them from the same place 
     * (for example, if you are implementing a custom slide animation and 
     * also need to use fadeIn()).
     */
    function appendCssTransition(el, transition, prefixedValues)
    {
        for (let prefix of ['', '-webkit-', '-moz-', '-o-', '-ms-'])
        {
            let value = prefixedValues ? prefix + transition : transition;
            let existingValue = el.style.transition;
            if (!existingValue || existingValue === 'all 0s ease 0s')
            {
                el.style.transition = value;
            }
            else if (existingValue.indexOf(value) === -1)
            {
                value = `${existingValue}, ${value}`;
                el.style.transition = value;
            }
        }
    }


    async function fadeIn(el, durationInMs)
    {
        if (!durationInMs)
        {
            durationInMs = 300;
        }
        await new Promise(resolve =>
        {
            const cssDuration = `${durationInMs / 1000}s`;
            appendCssTransition(el, `opacity ${cssDuration} ease 0s`);
            el.style.opacity = 1;

            // Resolve after durationInMs (sometimes transitionend events don't 
            // fire so we just use a timeout)
            setTimeout(resolve, durationInMs);
        });
    }


    async function fadeOut(el, durationInMs)
    {
        if (!durationInMs)
        {
            durationInMs = 300;
        }
        await new Promise(resolve =>
        {
            const cssDuration = `${durationInMs / 1000}s`;
            appendCssTransition(el, `opacity ${cssDuration} ease 0s`);
            el.style.opacity = 0;

            // Resolve after durationInMs (sometimes transitionend events don't 
            // fire so we just use a timeout)
            setTimeout(resolve, durationInMs);
        });
    }


    let loadedStyleSheets = {};

    /**
     * Adapted from http://stackoverflow.com/a/5537911/1196816
     */
    function loadStyleSheet(styleSheet, options)
    {
        let parent;
        if (options && options.parentId)
        {
            parent = document.getElementById(options.parentId);
            if (!parent)
            {
                throw new Error(`No element found with ID ${options.parentId}`);
            }
        }
        else
        {
            // Insert in head element by default
            parent = document.getElementsByTagName('head')[0];
        }

        let href = styleSheet.href ? styleSheet.href : styleSheet;
        if (options && options.baseUrl)
        {
            href = options.baseUrl + href;
        }

        // Create the link node
        let link = document.createElement('link');
        link.setAttribute('href', href);
        link.setAttribute('rel', 'stylesheet');
        link.setAttribute('type', 'text/css');
        if (styleSheet.media)
        {
            link.setAttribute('media', styleSheet.media);
        }

        // Resolve on both success and error and return a response object
        // (like fetch API)
        let promise = new Promise(resolve =>
        {
            link.onload = () => resolve({ok: true, status: 200, text: () => null});
            link.onerror = () => resolve({ok: false, status: 'error'});
        });

        // Insert the link node into the DOM and start loading the style
        // sheet
        parent.appendChild(link);

        return promise;
    }


    async function importCSS(css, options)
    {
        if (Array.isArray(css))
        {
            if (options && options.orderMatters)
            {
                for (let ss of css)
                {
                    await importCSS(ss, options);
                }
            }
            else
            {
                // Load simultaneously
                return Promise.all(css.map(
                    ss => importCSS(ss, options)));
            }
        }
        if (css in loadedStyleSheets && (options && !options.parentId))
        {
            return Promise.resolve({ok: true, status: 200, text: () => null});
        }

        let response = await loadStyleSheet(css, options);
        if (response.ok)
        {
            loadedStyleSheets[css] = true;
        }
        return response;
    }


    return {
        Model,
        Collection,
        Controller,
        fetch: fetch2,
        FetchError,
        HttpError,
        htmlToElement,
        htmlToElements,
        appendCssTransition,
        fadeIn,
        fadeOut,
        importCSS
    };
});
