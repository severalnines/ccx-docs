#!/usr/bin/env node

const ts = require('typescript');
const fs = require('fs');
const path = require('path');

// Read the sidebars.ts file
const sidebarsTsPath = path.resolve('sidebars.ts');
const source = fs.readFileSync(sidebarsTsPath, 'utf8');

// Parse the TypeScript source code
const sourceFile = ts.createSourceFile('sidebars.ts', source, ts.ScriptTarget.ES2015, true);

// Variable to hold the sidebars object
let sidebars = null;

// Function to recursively extract the sidebars variable
function extractSidebars(node) {
  if (ts.isVariableStatement(node)) {
    node.declarationList.declarations.forEach(declaration => {
      if (declaration.name && declaration.name.text) {
        const varName = declaration.name.text;
        if (declaration.initializer) {
          sidebars = {
            name: varName,
            value: nodeToObject(declaration.initializer),
          };
        }
      }
    });
  } else {
    ts.forEachChild(node, extractSidebars);
  }
}

// Function to convert TypeScript AST nodes to JavaScript objects
function nodeToObject(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const obj = {};
    node.properties.forEach(prop => {
      const key = prop.name.text;
      obj[key] = nodeToObject(prop.initializer);
    });
    return obj;
  } else if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map(element => nodeToObject(element));
  } else if (ts.isStringLiteral(node)) {
    return node.text;
  } else if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  } else if (ts.isBooleanLiteral(node)) {
    return node.kind === ts.SyntaxKind.TrueKeyword;
  } else if (ts.isNullLiteral(node)) {
    return null;
  } else if (node.kind === ts.SyntaxKind.Identifier) {
    return node.text;
  } else {
    // For other types, return undefined
    return undefined;
  }
}

// Start extracting the sidebars variable
extractSidebars(sourceFile);

if (!sidebars) {
  console.error('Error: Could not find sidebars variable in sidebars.ts');
  process.exit(1);
}

// Output the sidebars object as JSON
fs.writeFileSync('sidebars.json', JSON.stringify({ [sidebars.name]: sidebars.value }, null, 2));
console.log('sidebars.json generated successfully.');

