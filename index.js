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

function replace(file, rules){
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
};

ReplaceInFilePlugin.prototype.apply = function (compiler) {
	const root = compiler.options.context;

	compiler.plugin('done', (statsData) => {
		this.options.forEach(option => {
			const dir = option.dir ? option.dir : root;
			const files = option.files;

			if (files && Array.isArray(files) && files.length) {
				files.forEach(file=>{
					replace(path.resolve(dir, file), option.rules);
				})
			} else {
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
			}
		})
	});
};

module.exports = ReplaceInFilePlugin;