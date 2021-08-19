# Modelle: Intuitive, Minimal JavaScript UI Framework

## Why?
Few JavaScript frameworks allow clean separation of view and control logic concerns in accordance with the [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) design pattern. Most frameworks are designed around the concept of a JavaScript class that represents the view, with control logic embedded in the same class. But this adds an unnecessary layer of abstraction, when there already exists a standardized JavaScript abstraction for the view: the HTML element. What is typically called "view" in JavaScript frameworks is actually all control logic. This misconception is the reason why web UI development has been so framework-dependent, unintuitive, and difficult to learn.

In web-based user interfaces, the view is already modeled by the HTML element, and should not be modeled again as a JavaScript class. JavaScript code that builds the view, maps data to/from it, and handles user interaction is control logic, with a [separate concern](https://en.wikipedia.org/wiki/Separation_of_concerns) than that of the view.

Modelle is a simple framework that allows and encourages you to maintain clean separation between views and control logic, bringing clarity and agility to web-based user interface design.

## How Modelle UI Components Work
Modelle does not reinvent the wheel or introduce difficult-to-learn custom syntax, but rather facilitates precision and simplicity in standard JavaScript, HTML, and CSS.

For each UI component, you create two files: `view.html` and `control.js`. The `control.js` contains a function called `createView()`, where you:
1. Call the library function `modelle.createView(props)` to create the HTML element and bind event listeners declaratively. 
2. Fetch the `view.html` template and optionally other data.
3. Render the template into the HTML element that was created in step 1.

Any state that needs to be shared is stored in the property `props` of the HTML element. The element itself is passed in to each function of the control module.

`createView(props)` supports the following arguments:
* `tag`: HTML tag of the element (default = 'div')
* `el`: HTML element (if undefined, create a new element with the specified tag)
* `id`: ID to be assigned to the HTML element (optional)
* `eventListeners`: object containing delegated event listeners
* `cleanupView`: function to be called when the view is to be cleaned up (optional).
* `cleanupOnRemovedFromDOM`: whether to call cleanupView() when the view element is removed from the DOM (default = true)
* `onRemovedFromDOM`: function to be called when the view element is removed from the DOM.

`createView()` returns the HTML element that was created or passed in. The `props` argument that is passed in as assigned as a property to the element, with an additional `eventBus` property (`el.props.eventBus`) that
can be used for event management.

## Declarative Control Logic for Forms
`modelle.formControl.createView(options)`

Declarative form control logic, including mapping of a data model to/from form fields, validation, form submission, and error handling. 

Options:
* `errorClass`
* `getModelFormMap`
* `modelAttributeSetter`
* `validateModel`: function for validating the data entered into the form
* `validate`: function to customize the entire validation process (reading the form into the model, calling validateModel(), handling errors, etc.). Usually not needed as the default version is sufficient for most cases.
* `saveModel`: function to handle form submission 
* `showLoadingSpinner`
* `removeLoadingSpinner`
* `eventListeners`: same as modelle.createView() option
* `submitBtnSelector`
* `cancelBtnSelector`
* `model`: data model that will be mapped to/from form fields
* `onSubmitted`
* `onSubmitError`
* `onCanceled`

## Additional Helper Functions
A few additional helper functions are included in Modelle:
* `modelle.fetch(options)`: wrapper around window.fetch(options) that parses JSON and text responses and throws exceptions on errors.
* `modelle.runOnceOnDOM(el, fn)`: Run a function if an element is currently in the DOM or once it is added to the DOM.
* `modelle.htmlToElement(html)`: Convert an HTML string into an HTML element.
* `modelle.htmlToElements(html)`: Convert an HTML string into multiple HTML elements.
