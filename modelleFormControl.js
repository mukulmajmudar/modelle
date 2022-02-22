define([], function()
{
    'use strict';

    function asyncRequire(targets, options)
    {
        options = Object.assign(
        {
            timeout: 45000
        }, options);

        return new Promise((resolve, reject) =>
        {
            let required = false;
            if (!Array.isArray(targets))
            {
                targets = [targets];
            }
            require(targets, function(...args)
            {
                required = true;
                if (args.length === 1)
                {
                    resolve(args[0]);
                }
                else
                {
                    resolve(args);
                }
            });

            setTimeout(() =>
            {
                if (!required)
                {
                    reject(new asyncRequire.Error());
                }
            }, options.timeout);
        });
    }
    asyncRequire.Error = class extends Error {};


    class ValidationError extends Error
    {
        constructor(errors)
        {
            super();
            if (!errors)
            {
                errors = {};
            }
            this.errors = errors;
        }
    }


    async function createView(options)
    {
        options = Object.assign(
        {
            errorClass: 'erroneousInput',

            // Default attribute setter assigns property
            modelAttributeSetter: (model, attribute, value) =>
            {
                model[attribute] = value;
            },

            showLoadingSpinner,
            removeLoadingSpinner,
            getModelFormMap,
            validate,
            readAndValidate,
            eventListeners: getEventListeners(options)
        }, options);

        if (!options.model)
        {
            options.model = {};
        }

        // Import here to avoid circular dependency
        let modelle = await asyncRequire('modelle');

        // Create view
        let el = await modelle.createView(options);

        Object.assign(el.props,
        {
            submitBtnSelector: options.submitBtnSelector,
            cancelBtnSelector: options.cancelBtnSelector,
            model: options.model,
            errorClass: options.errorClass,
            modelAttributeSetter: options.modelAttributeSetter,
            getModelFormMap: options.getModelFormMap,
            submit: options.submit,
            cancel: options.cancel
        });

        return el;
    }


    function getEventListeners({submitBtnSelector, cancelBtnSelector})
    {
        let clickHandlers = {};
        clickHandlers[submitBtnSelector] = onSubmitClicked;
        clickHandlers[cancelBtnSelector] = onCancelClicked;
        return {click: clickHandlers};
    }


    function normalize(el, modelFormMap)
    {
        // Normalize model form map
        for (let attribute in modelFormMap)
        {
            if (!(Object.prototype.hasOwnProperty.call(modelFormMap, attribute)))
            {
                continue;
            }
            let map = modelFormMap[attribute];

            // Default value transformer is identity function
            if (!map.transformValue)
            {
                map.transformValue = value => value;
            }

            // Default value reader is value property of the element
            if (!map.formValueReader)
            {
                map.formValueReader = el => el.value;
            }

            // Default error class element is the attribute element
            if (!map.errorClassEl)
            {
                map.errorClassEl = map.el;
            }

            // Default error class for each attribute is the
            // common one
            if (!map.errorClass)
            {
                map.errorClass = el.props.errorClass;
            }
        }
    }


    /**
     * Read and validate the form.
     *
     * This can be overridden by passing in a custom readAndValidate() function into
     * createView().
     */
    async function readAndValidate(el)
    {
        let props = el.props;
        let modelFormMap = props._normalizedModelFormMap;

        // Clear form of any errors
        for (let attribute in modelFormMap)
        {
            if (!(Object.prototype.hasOwnProperty.call(modelFormMap, attribute)))
            {
                continue;
            }
            let map = modelFormMap[attribute];
            if (map.errorMessageEl)
            {
                map.errorMessageEl.innerHTML = '';
                map.el.classList.remove(map.errorClass);
                map.errorMessageEl.classList.add('hidden');
            }
        }

        await readFormIntoModel(el, modelFormMap);
        try
        {
            await props.validate(el);
        }
        catch(e)
        {
            /* eslint-disable max-depth */
            if (e instanceof ValidationError)
            {
                for (let erroneousAttribute in e.errors)
                {
                    if (!(Object.prototype.hasOwnProperty.call(e.errors, erroneousAttribute)))
                    {
                        continue;
                    }
                    const error = e.errors[erroneousAttribute];
                    let mapping = modelFormMap[erroneousAttribute];
                    if (mapping.errorMessageEl)
                    {
                        if (error.message)
                        {
                            mapping.errorMessageEl.innerHTML = error.message;
                        }
                        else if (mapping.errorMessages && mapping.errorMessages[error.code])
                        {
                            mapping.errorMessageEl.innerHTML = mapping.errorMessages[error.code];
                        }
                    }
                    else
                    {
                        if (mapping.errorMessages && mapping.errorMessages[error.code])
                        {
                            mapping.errorMessages[error.code]();
                        }
                    }
                    mapping.el.classList.add(mapping.errorClass);
                    if (mapping.errorMessageEl)
                    {
                        mapping.errorMessageEl.classList.remove('hidden');
                    }
                }
            }
            /* eslint-enable max-depth */

            throw e;
        }
    }


    async function readFormIntoModel(el, modelFormMap)
    {
        for (let attribute in modelFormMap)
        {
            if (!(Object.prototype.hasOwnProperty.call(modelFormMap, attribute)))
            {
                continue;
            }
            let mapping = modelFormMap[attribute];
            const formValue = await mapping.formValueReader(mapping.el);
            const value = await mapping.transformValue(formValue);
            el.props.modelAttributeSetter(el.props.model, attribute, value);
        }
    }


    async function onSubmitClicked(el)
    {
        let props = el.props;
        props.showLoadingSpinner(el);
        props._normalizedModelFormMap = props.getModelFormMap(el);
        normalize(el, props._normalizedModelFormMap);
        disableAllInputs(el);
        try
        {
            await props.readAndValidate(el);
            await props.submit(el);
        }
        finally
        {
            props.removeLoadingSpinner(el);
            enableAllInputs(el);
        }
    }


    function disableAllInputs(el)
    {
        for (let attribute of Object.keys(el.props._normalizedModelFormMap))
        {
            let map = el.props._normalizedModelFormMap[attribute];
            if (map.disableInput)
            {
                map.disableInput();
                continue;
            }
            map.el.disabled = true;
        }
        el.querySelector(el.props.submitBtnSelector).disabled = true;
    }


    function enableAllInputs(el)
    {
        let props = el.props;
        for (let attribute of Object.keys(props._normalizedModelFormMap))
        {
            let map = props._normalizedModelFormMap[attribute];
            if (map.enableInput)
            {
                map.enableInput();
                continue;
            }
            map.el.disabled = false;
        }
        el.querySelector(props.submitBtnSelector).disabled = false;
    }


    function showLoadingSpinner()
    {
        // Override
    }


    function removeLoadingSpinner()
    {
        // Override
    }


    function onCancelClicked(el)
    {
        el.props.cancel(el);
    }


    /**
     * Override to provide a map of model attribute => form components.
     */
    function getModelFormMap(el)
    {
        throw new Error('not implemented');
    }


    /**
     * Validate the data in the form. Override by passing in a custom
     * validate() function into createView().
     */
    async function validate(el)
    {
        await el.props.model.validate();
    }


    return {createView, readAndValidate, getEventListeners, ValidationError};
});
