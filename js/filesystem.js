var Filesystem = {
	fs: globalEnvironment['__fileSystem'], // path to file system
	currentDir: globalEnvironment['__currentDir'], // current directory
	
	//
	// HELPER FUNCTIONS
	//
		
	/*
	 * Gets new path (e.g. for 'cd' command)
	 */
	calculatePath: function(dir) {
		if (dir == '/') {
			return '/';
		} else {
			if (dir == "'") { dir = dir.slice(1); } // remove initial quote if exists 
			var pathComponents = this.currentDir.split('/');
			var dirComponents = dir.split('/');
			dirComponents.forEach(function (comp) {
				if (comp == '..') {
					pathComponents.pop();
				} else {
					pathComponents.push(comp);
				}
			});
			var newPath = pathComponents.join('/').replace(/\/+/g,'/');
			return (newPath != '') ? newPath : '/';
		}
	},
	
	/*
	 * Gets a file from a path
	 */
	getFileFromPath: function(path) {
		var pathSplit = path.split('/');
		var fileName = pathSplit[pathSplit.length - 1];
		var folderPath = this.calculatePath(pathSplit.slice(0, pathSplit.length - 1).join('/'));
		return this.fs[folderPath][fileName];
	},
	
	/*
	 * Gets all files in directory
	 */
	getDir: function(dir) {
		return this.fs[dir];
	},
	
	/*
	 * Creates/updates file at given path
	 */
	setFileAtPath: function(path, file) {
		var pathSplit = path.split('/');
		var fileName = pathSplit[pathSplit.length - 1];
		var folderPath = this.calculatePath(pathSplit.slice(0, pathSplit.length - 1).join('/'));
		this.fs[folderPath][fileName] = file;
	},
	
	/*
	 * Creates an empty directory with the given path
	 */
	createEmptyDir: function(path) {
		this.fs[path] = {};
	},
	
	//
	// EXCEPTIONS
	//
	
	
	/*
	 * Throws exception if path not valid
	 */
	checkPathExists: function(path) {
		if (this.fs[path] === undefined) {
			throw 'File system error: path "' + path + '" does not exist';
		}
	},
	
	/*
	 * Throws exception if file doesn't exist
	 */
	checkFileExists: function(file, path) {
		if (file === undefined) {
			throw 'File system error: file "' + path + '" does not exist';
		}
	},
	
	/*
	 * Throws exception if file is a directory
	 */
	checkNotADir: function(file, path) {
		if (file !== undefined && file.type == 'dir') {
			throw 'File system error: "' + path + '" is a directory';
		}
	},
	
	/*
	 * Throws exception if file/dir already exists
	 */
	checkAlreadyExists: function(file, path) {
		if (file !== undefined) {
			throw 'Error: "' + path + '" already exists';
		}
	},
	
	//
	// FILESYSTEM FUNCTIONS
	//
	
	/*
	 * Lists files in directory
	 */
	listFiles: function(dir) {
		var workingDir = dir ? this.calculatePath(dir) : this.currentDir;
		
		var fileNames = [];
		for (var fname in this.getDir(workingDir)) {
			fileNames.push(fname);
		}
		fileNames.sort();
		return fileNames;
	},
	
	/*
	 * Changes the current directory
	 * Returns the new path
	 */
	navigate: function(path) {
		var newPath = this.calculatePath(path);
		this.checkPathExists(newPath);
		this.currentDir = newPath;
		return newPath;
	},
	
	/*
	 * Returns file contents
	 */
	readFile: function(path) {
		var file = this.getFileFromPath(path);
		this.checkFileExists(file, path);
		this.checkNotADir(file, path);
		return file.contents;
	},
	
	/*
	 * Creates a directory
	 * Returns its path
	 */
	makeDir: function(name) {
		var newDirPath = this.calculatePath(name);
		this.checkAlreadyExists(this.getDir(name), newDirPath);
		this.createEmptyDir(newDirPath);
		this.setFile(newDirPath, { 'type': 'dir' });
		return newDirPath;
	},
	
	/*
	 * Creates new file
	 * Returns its path
	 */
	newFile: function(path) {
		var file = this.getFileFromPath(path);
		this.checkAlreadyExists(file);
		this.setFileAtPath(path, { 'type': 'file', 'contents': '' });
		return this.calculatePath(path);
	},
	
	/*
	 * Saves the file
	 * Returns its path
	 */
	saveFile: function(path, contents) {
		var file = this.getFileFromPath(path);
		this.checkNotADir(file);
		this.setFileAtPath(path, { 'type': 'file', 'contents': contents });
		return this.calculatePath(path);
	}
}