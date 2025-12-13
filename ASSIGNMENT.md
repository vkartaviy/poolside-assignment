# Assignment

**Case Study \| Fullstack**

This is a take-home exercise that will be validated by the poolside team. The exercise needs to compile and have tests. During a **1-hour technical interview**, one of our engineers will ask you questions about your code and will ask you to change the app.

The main objective of this exercise is to validate the technical knowledge of the candidate and how they can adapt their existing code to new requirements.

**Context**

poolside is composed of 3 main components:

- poolside assistant: IDE plugins that allow the extension of IDEs, like VSCode, to natively utilize poolside capabilities;

- poolside platform: a cloud service that can also be installed in a customer VPC to ensure data never leaves the customer premises;

- poolside model: a foundational large language model that supports all the underlying capabilities that can accelerate our users' development process;

The plugins for the IDEs are primarily built on svelte and run on the IDE native shells.

For this exercise we want you to mimic such plugins.

**Questions**

Please create GitHub repo (or similar), and share with us an application that solves the following requirements.

We want to have a native application that represents a collaborative TODO list.

Each TODO has:

- 3 states: TODO, ONGOING, DONE;

- A user associated with it, the one that created the todo;

- The time when the TODO was last updated;

Users can change TODOs state back and forward.

Transitions need to be sequential TODO > ONGOING > DONE > ONGOING > TODO. There’s no chance to move directly from TODO to DONE.

Whenever a user opens the desktop application we will get the data from the server and will keep it in sync. Users are created the first time they open the application and can either join a TODO list, by using a shared textual key, or they can create a new TODO list, which will generate a random login key.

Both the server and desktop application need to be built based on a script and must run locally. The server should represent a restful API that can easily be set up. The client-side needs to run inside an electron shell, so that it can work both on Mac and Windows.

The candidate should also build some tests and ensure they can run locally.

---

**Here's some guidance for the assignment:**

We generally see people spend around 3–6 hours on the task. It’s intentionally a bit larger than most people can fully complete in that time. The goal isn’t to finish everything, but to see how you:

- Identify and focus on the most important parts
- Make trade-offs and intentionally leave some things out
- Explain your prioritization and decision-making in the follow-up conversation

The use of AI tooling is fine, you can use whatever you normally would to get their job done. Please keep in mind that the team will be closely reviewing the result and digging into the code & making modifications in the technical interview.
