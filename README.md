# Modelle: Intuitive, Minimal JavaScript UI Framework

## Why?
Few JavaScript frameworks allow clean separation of view and control logic concerns in accordance with the [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) design pattern. Most frameworks are designed around the concept of a JavaScript class that represents the view, with control logic embedded in the same class. But this adds an unnecessary layer of abstraction, when there already exists a standardized JavaScript abstraction for the view: the HTML element. What is typically called "view" in JavaScript frameworks is actually all control logic. This misconception is the reason why web UI development has been so framework-dependent, unintuitive, and difficult to maintain.

In web-based user interfaces, the view is already modeled by the HTML element, and should not be modeled again as a JavaScript class. JavaScript code that builds the view, maps data to/from it, and handles user interaction is control logic, with a [separate concern](https://en.wikipedia.org/wiki/Separation_of_concerns) than that of the view.

Modelle is a simple framework that allows and encourages you to maintain clean separation between views and control logic, bringing clarity and agility to web-based user interface design.

## How Modelle UI Components Work
Modelle does not reinvent the wheel or introduce new syntax, but rather facilitates precision and simplicity in standard JavaScript, HTML, and CSS.

For each UI component, you create two files: `view.html` and `control.js`. The `control.js` contains a function called `createView()`, where you:
1. Call the library function `modelle.createView(options)` to create the HTML element and bind event listeners declaratively. 
2. Fetch the `view.html` template and optionally other data.
3. Render the template into the HTML element that was created in step 1.

Any state that needs to be shared is stored in the property `props` of the HTML element. The element itself is passed in to each function of the control module.

`createView(options)` supports the following options:
* `tag` (optional, default = `'div'`): HTML tag of the element.
* `el` (optional): HTML element (if undefined, a new element will be created with the specified tag)
* `id` (optional): ID to be assigned to the HTML element.
* `eventListeners` (optional): object containing delegated event listeners
* `cleanupView` (optional): function to be called when the view is to be cleaned up.
* `cleanupOnRemovedFromDOM` (optional, default = `true`): whether to call cleanupView() when the view element is removed from the DOM.
* `onRemovedFromDOM` (optional): function to be called when the view element is removed from the DOM.

`createView()` returns the HTML element that was created or passed in. The `options` argument that is passed in is assigned as a property called `props` to the element, along with an additional `eventBus` property (`el.props.eventBus`) that
can be used for event management.

## Declarative Control Logic for Forms
`modelle.formControl.createView(options)`

Declarative form control logic, including mapping to a data model from form fields, validation, form submission, and error handling. 

Options:
* All options of `modelle.createView()` above.
* `submitBtnSelector`: CSS selector for the form's submit button.
* `submit`: function to handle form submission, of the form `el => { // submit form }`. When this function is called, `el.props.model` has already been populated from the form fields and validation has succeeded.
* `getModelFormMap`: a mapping of model attributes to form components, of the following form: 

        {
            modelAttribute1:
            {
                el: form element corresponding to the attribute,
                errorClass (optional): CSS class to be added on error. The default is the value of the "errorClass" argument provided to createView().
                errorClassEl (optional): element on which the errorClass is to be added. The default is the value of the "el" argument.
                errorMessageEl (optional): error message element for the attribute,
                errorMessages (optional):  mapping of error codes to error messages (used in conjunction with ValidationError)
                {
                    errorCode1: 'Error message 1',
                    errorCode2: 'Error message 2'
                },
                formValueReader (optional): function to read the attribute from the form. The default is el => el.value.
                transformValue (optional): function to transform the form field value before storing it in the model. The default is value => value.
            },
            modelAttribute2:
            {
                ...
            }
        }

* `model` (optional): data model to which form fields will be mapped. If not specified, a new Object will be created to store the attributes.
* `cancelBtnSelector` (optional): CSS selector for the form's cancel button.
* `cancel` (optional): Function to call upon form cancellation.
* `errorClass` (optional): CSS class to be added to an erroreous field. The default is 'erroneousInput'.
* `validate` (optional): function for validating the model after storing data into it from the form. The default is `el => el.props.model.validate()`.
* `readAndValidate` (optional): function to override the entire read-and-validation process (including reading the form into the model, calling validate(), handling errors, etc.). Usually not needed as the default version is sufficient for most cases.
* `modelAttributeSetter` (optional): function to set attributes on the model. The default is `(model, attribute, value) => model[attribute] = value`
* `showLoadingSpinner` (optional): function to show a loading spinner. If not supplied, no loading spinner will be shown.
* `removeLoadingSpinner` (optional): function to remove a loading spinner.

## Additional Helper Functions
A few additional helper functions are included in Modelle:
* `modelle.fetch(options)`: wrapper around window.fetch(options) that parses JSON and text responses and throws exceptions on errors.
* `modelle.runOnceOnDOM(el, fn)`: Run a function if an element is currently in the DOM or once it is added to the DOM.
* `modelle.htmlToElement(html)`: Convert an HTML string into an HTML element.
* `modelle.htmlToElements(html)`: Convert an HTML string into multiple HTML elements.
