# Irongenerator Styleguides

While this certainly won't be a totally all-inclusive style guide, we want to nail down some rules so we can be consistent.

A few may seem arbitrary, but they're based on how easy it is to be inconsistent, so let's consider it a part of working together and use it as our shared defaults.

If there are any really major issues or significantly impactful reasons to change, add, or remove rules from our shared style guide, make an issue and let's discuss it and decide what to do accordingly.

## Naming conventions

Naming things is one of the hardest tasks known to programmers. If we settle on some fundamental principles, it should be doable.

### Use `lowerCamelCase` for variables, properties and function names <small>[(source)](https://github.com/felixge/node-style-guide#use-lowercamelcase-for-variables-properties-and-function-names)</small>

- Variables, properties, and function names should use **lowerCamelCase**.
- Names should also be descriptive.
- Variable names should be explicit, but only as verbose as strictly necessary. For example, we can use `i` when iterating in a `for` loop, but should have meaningful names for variables in other contexts.
- The plurality of a variable name should be meaningful (eg. `post` holds a _post_ document, `posts` is an array of _post_ documents).
- Single character variables and uncommon abbreviations should generally be avoided.

```jsx
// right:
const schoolMonths = [...];
const student = {
    firstName: 'Ana'
};

function calcSum(arr){...}


// wrong:
const school_months = [...];
const student = {
    first_name: 'Ana'
};

function calc_sum(arr){...}
```

### Use `UpperCamelCase` for class names <small>[(source)](https://github.com/felixge/node-style-guide#use-uppercase-for-constants)</small>

- Class names should be capitalized using `UpperCamelCase`.

```jsx
// right:

class BankAccount {}

// wrong:
class bank_account {}
```

### Use UPPERCASE for Constants <small>[(source)](https://github.com/felixge/node-style-guide#use-uppercamelcase-for-class-names)</small>

```jsx
const PI = 3.1415;
```

## Conditionals

- Always use strict equality operator (`===`). Never use loose equality (~~`==`~~).
- Use the ternary operator when it makes sense and helps code readability.

```jsx
const foo = a === b ? 1 : 2;
```

- Use descriptive conditions. <small>[(source)](https://github.com/felixge/node-style-guide#use-descriptive-conditions)</small>
  Any non-trivial conditions should be assigned to a descriptively named variable or function:

```jsx
// right:

const isValidPassword = password.length >= 4 && /^(?=.*\d).{4,}$/.test(password);

if (isValidPassword) console.log('Password validation successful!');

// wrong:

if (password.length >= 4 && /^(?=.*\d).{4,}$/.test(password)) console.log('blah!');
```

## Functions <small>[(see examples of right and wrong here)](https://github.com/felixge/node-style-guide#functions-1)</small>

- Write short functions. Limit yourself to up to 15 lines per function.
- Return early from functions.
- Chain the methods.
  - One method per line should be used if you want to chain methods.
  - You should also indent these methods so its easier to tell they are part of the same chain.

```jsx
// right:

User.findOne({ name: 'foo' })
  .populate('bar')
  .then(() => console.log('success!'))
  .catch(err => console.log(`ooops: ${err}`));

// wrong:

User.findOne({ name: 'foo' })
  .populate('bar')
  .then(() => console.log('sucess!'))
  .catch(err => console.log(`ooops: ${err}`));

User.findOne({ name: 'foo' })
  .populate('bar')
  .then(() => console.log('sucess!'))
  .catch(err => console.log(`ooops: ${err}`));
```

## Comments

- Use two forward slashes for comments.
  Use slashes for both single-line and multi-line comments. Try to write comments that explain higher-level mechanisms or clarify difficult segments of your code. Don't use comments to explain trivial things.

## File names

- Use `kebab-case` whenever possible (eg.: `log-in.hbs`). There are two **exceptions** for this rule:
  - `.hbs` partials only allow alphanumerical characters. Those should be named by concatenating words, entirely with lowercase characters (eg.: `signinform.hbs`).
  - React component files should be named with `PascalCase`, matching the name of the component being exported, as is a convention (eg. `SignInForm.jsx`).
- When naming routes files, models files, configs files use the corresponding name that is self-explanatory. Example: `user.model.js`, `upload.config.js`, `auth.routes.js`

## Routes names

- We will rely on the _[RestAPI naming conventions](https://restfulapi.net/resource-naming)_.

- Use the appropriate HTTP verb for any given action (GET, POST, PUT, DELETE).

- When naming the route itself, try to use one word and if more than one word is needed, use `kebab-case`. For example:

```javascript
//             route                                    file
//               |                                       |
router.get('/sign-up', (req, res) => res.render('auth/sign-up'));

//      or '/wish-list'
router.get('/wishlist', (req, res) => res.render('carts/wish-list'));
```

## Syntax

- Use destructuring whenever possible - it makes syntax shorter and cleaner and it's the best-practice. Example:

```jsx
const { join } = require('path');
const { Router } = require('express');
```

- Take advantage of arrow functions whenever that is possible. Example:

```jsx
// Catch missing routes and forward to error handler
app.use((req, res, next) => next(createError(404)));

router.get('/', (req, res) => res.render('index', { title: 'Hello World!' }));
```

- Don't include the `next` argument in the callback if it goes unused.

- Make heavy use of the `.env` file from the beginning. The values of all secret vars should be stored there. Example: `MONGODB_URI`, `SESSION_SECRET`, etc.

## Linting

Use the `.prettierrc` file when working in the `irongenerator` app:

```json
{
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "htmlWhitespaceSensitivity": "css",
  "insertPragma": false,
  "jsxBracketSameLine": false,
  "jsxSingleQuote": false,
  "printWidth": 100,
  "proseWrap": "preserve",
  "quoteProps": "as-needed",
  "requirePragma": false,
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "useTabs": false
}
```

## Extra resources

- [Node.js Style Guide](https://github.com/felixge/node-style-guide)
