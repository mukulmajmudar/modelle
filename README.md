# Modelle: JavaScript MVC with better naming

## Why?
Few JavaScript frameworks properly separate view and controller concerns in accordance with the [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) design pattern. In most popular frameworks, the controller is merged in with the view, which makes UI development less intuitive and fools you into believing that the view is something which it is not.

## How Modelle Works
In HTML/CSS/JavaScript user interfaces, the view is represented in HTML and CSS, and should not be modeled in JavaScript at all. JavaScript code that connects data to and from the view and handles user interaction is all control logic, with a [separate concern](https://en.wikipedia.org/wiki/Separation_of_concerns) than that of the view. This control logic is programmed as object-oriented controllers for reusability and extensibility. Modelle provides a flexible Controller base class to help you create user interfaces with clarity and agility.

Modelle also provides intuitive Model and Collection classes for REST API data modeling using the browser's fetch() API.
