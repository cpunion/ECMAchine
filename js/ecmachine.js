/*
 * Modify toString behavior of lists to Lisp style
 */
Array.prototype.toString = function() {
	return '(' + this.join(' ') + ')';
};

/*
 * Parses S-expression into a nested list
 */
function parse(sexp) {
	var isInt = function(value) {
	  if ((parseFloat(value) == parseInt(value)) && !isNaN(value)){
	      return true;
	  } else { 
	      return false;
	  }
	};
	
	var tokenize = function(sexp) {
        var sexp = sexp.substring(1, sexp.length-1);
        var openParens = 0;
   		var tokens = [];
		var currentToken = '';                                        
        for (var i = 0; i < sexp.length; i++) {
        	if (sexp[i] == ' ' && openParens == 0) {
        		tokens.push(currentToken);
                currentToken = '';
        	} else {
        		currentToken += sexp[i];
        		if (sexp[i] == '(') {
        			openParens++;
        		} else if (sexp[i] == ')') {
        			openParens--;
        		}
        	}
        }
		tokens.push(currentToken);        
    	return tokens;
    };
	
	if (sexp[0] == '(') {
		var parsed_sexp = [];
		var tokens = tokenize(sexp);
		for (var i = 0; i < tokens.length; i++) {
			parsed_sexp.push(parse(tokens[i]));
		}
		return parsed_sexp;
	} else if (isInt(sexp)) {
		return parseInt(sexp);
	} else {
		return sexp;
	}
}

/*
 * Evaluates a parsed S-expression, Lisp-style
 */
function evaluate(sexp, environment, terminal) {
	var fs = environment['__fileSystem'];
	var dir = environment['__currentDir'];
	var controlFlowStatements = ['if', 'cond', 'quote', 'begin', 'define', 'lambda'];
	
	if (typeof sexp != 'object') { // atom
		if (sexp == '#t') {
			return true;
		} else if (sexp == '#f') {
			return false;
		} else if (typeof sexp == 'number') { // number
			return sexp;
		} else if (sexp[0] == "'") { // string literal
			return sexp.slice(1);
		} else { // variable
			return environment[sexp];
		}
	}
	
	var func = sexp[0];
	
	if (func.lambda || controlFlowStatements.indexOf(func) > -1) {
		// lambda or control flow statement: don't evaluate arguments
		var args = sexp.slice(1);
	} else {
		// evaluate arguments
		var args = [];
		for (var i = 1; i < sexp.length; i++) {
			var evaluatedArg = evaluate(sexp[i], environment);
			if (evaluatedArg) {
				args.push(evaluatedArg);
			} else {
				throw 'Error: Cannot evaluate token "' + sexp[i] + '"';
			}
		}
	}
	
	if (func.lambda) {
		// Lambda function
		
		environment = func.environment;
		if (func.arguments.length > args.length) {
			throw 'Error: Not enough arguments passed to lambda: expected ' + func.arguments + ' but received ' + args;
			return 'Error';
		}
		for (var i = 0; i < func.arguments.length; i++) {
			environment[func.arguments[i]] = args[i];
		}
		return evaluate(func.body, environment);
	} else if (typeof func == 'string') {
		// Built-in function
		
		switch(func) {
			// Arithmetic
			case '+':
			case '-':
			case '*':
			case '/':
				args = args.map(function (arg) {
					if (typeof arg == 'string') { // this lets us overload + for string concatenation
						return '"' + arg + '"';
					} else {
						return arg;
					}
				})
				return eval(args.join(func));
				
			// Comparisons
			case '=':
				return (args[0] == args[1]);
			case '>':
			case '<':
			case '>=':
			case '<=':
			case '==':
			case '!=':
				return eval(args[0] + func + args[1]);
				
			// Logical
			case 'not':
				return !(args[0]);
			case 'and':
				return eval(args.join('&&'));
			case 'or':
				return eval(args.join('||'));
				
			// Conditionals
			case 'if':
				if (evaluate(args[0], environment)) {
					return evaluate(args[1], environment);
				} else {
					return evaluate(args[2], environment);
				}
			case 'cond':
				for (var i = 0; i < args.length; i++) {
					var condBlock = args[i];
					if (evaluate(condBlock[0], environment)) {
						return evaluate(condBlock[1], environment);
					}
				}
			
			// List operations
			case 'cons':
				return new Array(args[0], args[1]);
			case 'car':
				var arg = args[0];
				return arg[0];
			case 'cdr':
				var arg = args[0];
				return arg.slice(1);
			case 'list':
				return args;
			
			// Lambdas and scoping stuff
			case 'define':
				environment[args[0]] = args[1];
				break;
			case 'lambda':
				return {
					'lambda': true,
					'arguments': args[0],
					'body': args[1],
					'environment': environment
				}
			
			// Misc Lisp
			case 'quote':
				return args[0];
			case 'begin':
				for (var i = 0; i < args.length - 1; i++) {
					evaluate(args[i], environment);
				}
				return evaluate(args[args.length - 1], environment);
			
			// Filesystem
			case 'ls':
				var fileNames = [];
				for (fname in fs[dir]) {
					fileNames.push(fname);
				}
				return fileNames;
			case 'cd':
				var newPath = calculatePath(dir, args[0]);
				if (fs[newPath] === undefined) {
					throw 'Error: path "' + newPath + '" does not exist';
				}
				environment['__currentDir'] = newPath;
				terminal.set_prompt('ecmachine:' + newPath + ' guest$');
				return;
			case 'read':
				var contents = fs[dir][args[0]].contents;
				return contents;
			case 'exec':
				var contents = parse(fs[dir][args[0]].contents);
				return evaluate(contents, globalEnvironment);
			case 'mkdir':
				var newDirPath = calculatePath(dir, args[0]);
				environment['__fileSystem'][dir][args[0]] = { 'type': 'dir' };
				environment['__fileSystem'][newDirPath] = {};
				return;
			
			// Not a built-in function: find function in environment and evaluate
			default:
				sexp[0] = evaluate(environment[func], environment);
				return evaluate(sexp, environment);
		}
	} else {
		// Evaluate this function
		sexp[0] = evaluate(func, environment);
		return evaluate(sexp, environment);
	}
}

/*
 * Gets new path (e.g. for 'cd' command)
 */
function calculatePath(currentPath, dir) {
	if (dir == '/') {
		return '/';
	} else {
		var pathComponents = currentPath.split('/');
		var dirComponents = dir.split('/');
		dirComponents.forEach(function (comp) {
			if (comp == '..') {
				pathComponents.pop();
			} else {
				pathComponents.push(comp);
			}
		});
		var newPath = pathComponents.join('/').replace('//','/');
		return (newPath != '') ? newPath : '/';
	}
}

// (+ (* 2 5) 3) => ['+', ['*', 2, 5], 3]
