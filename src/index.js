const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  //Receiving the username on the header
  const { username } = request.headers;

  if (!username) {
    return response.status(404).json({ error: `User not defined!` });
  }

  const user = users.find((element) => element.username === username);

  if (!user) {
    //user not found
    return response.status(404).json({ error: `User ${username} not found!` });
  }

  request.user = user;
  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;
  console.log(user);

  return user.pro || user.todos.length < 10
    ? next()
    : response
        .status(403)
        .json({ error: `${user.username} exceeded the free plan` });
}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;

  if (!username) {
    return response.status(404).json({ error: `User not defined!` });
  }

  const user = users.find((element) => {
    return element.username === username;
  });

  if (!user) {
    return response.status(404).json({ error: `User ${username} not found!` });
  }

  const { id } = request.params;
  if (!validate(id)) {
    return response.status(400).json({ error: "Invalide id" });
  }
  const todos = user.todos;
  const todo = todos.find((todo) => {
    return todo.id === id;
  });

  if (todo) {
    request.user = user;
    request.todo = todo;
    return next();
  }
  return response.status(404).json({ error: "Todo not found" });
}

function findUserById(request, response, next) {
  //Receiving the username on the header
  const { id } = request.params;
  const user = users.find((user) => {
    return user.id === id;
  });
  if (user) {
    request.user = user;
    return next();
  }
  //user not found
  response.status(404).json({ error: `User ${id} not found!` });
}
app.post("/users", (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some(
    (user) => user.username === username
  );

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: [],
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get("/users/:id", findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch("/users/:id/pro", findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response
      .status(400)
      .json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return response.json(user);
});

app.get("/todos", checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post(
  "/todos",
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
      id: uuidv4(),
      title,
      deadline: new Date(deadline),
      done: false,
      created_at: new Date(),
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
  }
);

app.put("/todos/:id", checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete(
  "/todos/:id",
  checksExistsUserAccount,
  checksTodoExists,
  (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
      return response.status(404).json({ error: "Todo not found" });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
  }
);

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById,
};
