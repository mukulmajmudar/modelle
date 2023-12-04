define(['modelleFormControl'], function(formControl)
{
    'use strict';

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

        if (options.acceptableStatusCodes.length > 0)
        {
            options.parseResponse = false;
        }

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
            if (!contentType)
            {
                return response;
            }
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
                        if (descendantEl.props && descendantEl.props.onRemovedFromDOM)
                        {
                            promises.push(descendantEl.props.onRemovedFromDOM(descendantEl));
                        }
                    }
                    /* eslint-enable max-depth */
                    await Promise.all(promises);
                }

                // If the removed node is a view itself, call removed callback
                if (node.props && node.props.onRemovedFromDOM)
                {
                    await node.props.onRemovedFromDOM(node);
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
     * Adapted from http://stackoverflow.com/a/5537911
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

    let defaultEventBusModule;

    /**
     * Set a default event bus module. The interface is:
     * {
     *     create: {function(): Object},
     *     stop: {function(Object): {void}}
     * }
     */
    function setDefaultEventBusModule(eventBusModule)
    {
        defaultEventBusModule = eventBusModule;
    }


    /**
     * Properties:
     * 1. tag (optional): HTML tag of the element (default = 'div')
     * 2. el (optional): HTML element (if undefined, a new element will be created with the specified tag).
     * 3. id (optional): ID to be assigned to the HTML element.
     * 4. eventListeners (optional): object containing delegated event listeners.
     * 5. cleanupView (optional): function to be called when the view is to be cleaned up.
     * 6. cleanupOnRemovedFromDOM (optional, default = true): whether to call cleanupView() when the view element is removed from the DOM.
     * 7. onRemovedFromDOM (optional): function to be called when the view element is removed from the DOM.
     */
    function createView(properties)
    {
        if (!properties.tag)
        {
            properties.tag = 'div';
        }

        // Cleanup view on removal by default
        // eslint-disable-next-line
        if (properties.cleanupOnRemovedFromDOM === undefined)
        {
            properties.cleanupOnRemovedFromDOM = true;
        }
        let el;
        if (properties.el)
        {
            el = properties.el;
            delete properties.el;
        }
        else
        {
            el = document.createElement(properties.tag);
        }

        if (properties.id)
        {
            el.id = properties.id;
        }

        el.props = properties;

        if (properties.eventListeners)
        {
            addEventListeners(el, properties.eventListeners);
        }

        let customOnRemovedFromDOM;
        if (properties.onRemovedFromDOM)
        {
            customOnRemovedFromDOM = properties.onRemovedFromDOM;
        }
        properties.onRemovedFromDOM = async function()
        {
            if (customOnRemovedFromDOM)
            {
                await customOnRemovedFromDOM(el);
            }
            if (properties.cleanupOnRemovedFromDOM)
            {
                if (properties.cleanupView)
                {
                    await properties.cleanupView(el);
                }
                else
                {
                    cleanupView(el);
                }
            }
        };

        // Create dedicated event bus for the view
        let eventBusModule = defaultEventBusModule || properties.eventBusModule;
        if (!eventBusModule)
        {
            throw Error("No event bus module configured.");
        }
        Object.assign(properties,
        {
            eventBus: eventBusModule.create(),
            eventBusModule: eventBusModule
        });

        return el;
    }


    function cleanupView(el)
    {
        removeEventListeners(el);
        el.props.eventBusModule.stop(el.props.eventBus);
        delete el.props;
    }


    function addEventListeners(el, eventListenersMap)
    {
        removeEventListeners(el);
        el._modelleActualEventListeners = {};
        for (let eventName of Object.keys(eventListenersMap))
        {
            let eventListeners = eventListenersMap[eventName];

            /* eslint-disable */
            async function actualEventListener(event)
            {
                // Make a list of non-empty selectors to process:
                // To support event delegation with potentially nested delegators
                // we have to process in order of innermost to outermost.
                let selectorsToProcess = [];
                let processViewElEvent;
                for (let selector of Object.keys(eventListeners))
                {
                    if (selector)
                    {
                        selectorsToProcess.push(selector);
                    }
                    else
                    {
                        processViewElEvent = true;
                    }
                }

                // Store references to the original stop propagation functions
                let origStopPropagation = event.stopPropagation.bind(event);
                let origStopImmPropagation = event.stopImmediatePropagation.bind(event);
                
                // Overwrite stop propagation methods: since we are handling
                // the bubbling manually, these methods have to be customized.
                Object.assign(event,
                {
                    stopPropagation: function()
                    {
                        // Call original stopPropagation()
                        origStopPropagation();

                        // Stop processing all other selectors
                        selectorsToProcess.splice(0);
                    },
                    stopImmediatePropagation: function()
                    {
                        // Call original stopImmediatePropagation()
                        origStopImmPropagation();

                        // Stop processing all other selectors
                        selectorsToProcess.splice(0);
                    }
                });

                while (selectorsToProcess.length > 0)
                {
                    // Find the innermost element to process
                    let selectorsCommaSeparated = selectorsToProcess.join(', ');
                    let element = event.target.closest(selectorsCommaSeparated);

                    // If no matching element found, we are done processing
                    if (!element)
                    {
                        break;
                    }

                    // Find the selector that was matched
                    let selector = selectorsToProcess.find(s => element.matches(s));

                    // Provide delegator target element in the event
                    event.delegatorTarget = element;

                    // Call the event listener
                    let listener = eventListeners[selector];
                    await listener(el, event);

                    // Remove selector from list to process (mark as done)
                    selectorsToProcess = selectorsToProcess.filter(s => s !== selector);
                }

                // Lastly, process event on the view element, if any
                if (processViewElEvent)
                {
                    // Provide delegator target element in the event
                    event.delegatorTarget = el;

                    // Call the event listener
                    let listener = eventListeners[''];
                    await listener(el, event);
                }
            }
            /* eslint-enable */

            el.addEventListener(eventName, actualEventListener);
            el._modelleActualEventListeners[eventName] = actualEventListener;
        }
    }


    function removeEventListeners(el)
    {
        if (!el._modelleActualEventListeners)
        {
            return;
        }
        for (let [eventName, eventListener] of Object.entries(el._modelleActualEventListeners))
        {
            el.removeEventListener(eventName, eventListener);
        }

        delete el._modelleActualEventListeners;
    }


    /**
     * Run a function if an element is currently in the
     * DOM or once it is added to the DOM.
     */
    function runOnceOnDOM(el, fn)
    {
        // Schedule callback for when view is added to DOM
        setTimeout(async () =>
        {
            await idleUntilOnDOM(el);
            fn();
        }, 1);
    }


    return {
        formControl,
        fetch: fetch2,
        FetchError,
        HttpError,
        htmlToElement,
        htmlToElements,
        appendCssTransition,
        fadeIn,
        fadeOut,
        importCSS,
        createView,
        cleanupView,
        runOnceOnDOM,
        addEventListeners,
        removeEventListeners,
        setDefaultEventBusModule
    };
});
