# Modelle: Intuitive, Minimal JavaScript MVC

## Why?
Few JavaScript frameworks allow clean separation of view and control logic concerns in accordance with the [Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller) design pattern. In most popular frameworks, control logic is encouraged to be embedded in the view, which makes UI development less intuitive.

Modelle is a framework that allows and encourages clean separation between views and control logic.

## How Modelle Works
In HTML/CSS/JavaScript user interfaces, the view is represented in HTML and CSS, and should not be modeled as a JavaScript class. JavaScript code that connects data to and from the view and handles user interaction is all control logic, with a [separate concern](https://en.wikipedia.org/wiki/Separation_of_concerns) than that of the view. Modelle helps you maintain complete separation of control logic from view, bringing clarity and agility to user interface design.
