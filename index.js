'use strict';

const path = require('path');
const fs = require('fs');

function getAllFiles(root) {
	var res = [],
		files = fs.readdirSync(root);
	files.forEach(function (file) {
		var pathname = root + '/' + file,
			stat = fs.lstatSync(pathname);

		if (!stat.isDirectory()) {
			res.push(pathname);
		} else {
			res = res.concat(getAllFiles(pathname));
		}
	});
	return res
}

function replace(file, rules) {
	const src = path.resolve(file);
	let template = fs.readFileSync(src, 'utf8');

	template = rules.reduce(
		(template, rule) => template.replace(
			rule.search, (typeof rule.replace === 'string' ? rule.replace : rule.replace.bind(global))
		),
		template
	);

	fs.writeFileSync(src, template);
}

function ReplaceInFilePlugin(options = []) {
	this.options = options;
}

ReplaceInFilePlugin.prototype.apply = function (compiler) {
	const root = compiler.options.context;

	this.options.forEach(option => {

		const done = () => {
			const dir = option.dir || root;

			if (option.files) {
				const files = option.files;
				if (Array.isArray(files) && files.length) {
					files.forEach(file => {
						replace(path.resolve(dir, file), option.rules);
					})
				}
			} else if (option.test) {
				const test = option.test;
				const testArray = Array.isArray(test) ? test : [test];
				const files = getAllFiles(dir);

				files.forEach(file => {
					const match = testArray.some((test, index, array) => {
						return test.test(file);
					})

					if (!match) {
						return;
					}

					replace(file, option.rules);
				})
			} else {
				const files = getAllFiles(dir);
				files.forEach(file => {
					replace(file, option.rules);
				})
			}

		}

		const {hook = 'done'} = option;

		if (compiler.hooks) {
			compiler.hooks[hook].tap({
				name: "ReplaceInFilePlugin"
			}, done);
		} else {
			compiler.plugin(hook, done);
		}

	})
};

module.exports = ReplaceInFilePlugin;
