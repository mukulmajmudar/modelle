# Modelle: JavaScript MVC with better naming

## Why?
Few JavaScript frameworks properly separate view and control logic concerns in accordance with the [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) design pattern. In most popular frameworks, the control logic is merged in with the view, which makes UI development less intuitive and fools you into believing that the view is something which it is not.

Fundamentally, data is separate from operations on that data, and a framework should support precise implementation of design principles.

## How Modelle Works
In HTML/CSS/JavaScript user interfaces, the view is represented in HTML and CSS, and should not be modeled as a JavaScript class. JavaScript code that connects data to and from the view and handles user interaction is all control logic, with a [separate concern](https://en.wikipedia.org/wiki/Separation_of_concerns) than that of the view. Modelle helps you maintain complete separation of control logic from view, bringing clarity and agility to user interface design.
