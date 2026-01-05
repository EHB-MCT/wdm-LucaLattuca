#Conventions

There is no single convention for React Native, therefore all refer to conventions in this file.

0. Basic rules :

- alsways use const or let to define variable
- Only Functional components
- No nested components : seperate

1. Naming conventions :
   this code uses the Airbnb convention

- Folders : camelCase
- Variables /functions : camelCase
- Components : PascalCase
- Constants : UPPER_SNAKE_CASE
- Booleans : starts with "is", "has", "should"

2.  Imports in order
    a. React import
    b. Library imports (Alphabetical order)
    c. Absolute imports from the project (Alphabetical order)
    d. Relative imports (Alphabetical order)
    e. Import \* as
    f. Import ‘./<some file>.<some extension>

3.  Types

- always define type if possible

4.  Interface

- Use interfaces to define shape or structure of an object

5. imports

- Absolute paths "C/users/name/project/file.tsx"
- Relative paths Only when reffering to files in the same location

6. exports

- use named exports for everything in the file rather than one default export
- dont bundle functionality into one object

7. Styling

- Try to prevent inline styling -> use stylesheet.create()

8. Consistency

- Try arrow functions when declaring a function

9.  folder structure

project-root/
├── backend/ # Laravel application
│ ├── app/  
│ └── Console/commands # game and user simulators
│ └── HTTP/Controllers # controllers
│ └── Models # contains all models
│ └── Services # contains all Services
│ ├── config/
│ ├── database/
│ ├── public/
│ ├── composer.json
│ ├── artisan
│ ├── .env
│ └── Dockerfile
├── frontend/ # React Native Expo application
│ ├── app/ # contains all screens, tabs, game logic
│ ├── assets/ # contains assets used in the application
│ ├── components/ # all standalone components are placed in this folder
│ ├── contexts/ # context files
│ ├── config/ # configuration files
│ │ └── api.js
│ ├── package.json
│ └── app.json
├── docker/
│ └── nginx/
│ └── nginx.conf
├── docker-compose.yml
└── README.md

##Sources

- https://medium.com/@mahesh.nagpure.mailbox/react-native-coding-standard-structure-ab5c5f9e6784
- https://gilshaan.medium.com/react-native-coding-standards-and-best-practices-5b4b5c9f4076
- https://chatgpt.com/c/68e902f0-d04c-8330-8558-5bc77c20e599
- https://airbnb.io/javascript/react/#alignment
