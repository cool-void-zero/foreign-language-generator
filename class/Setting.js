const path = require('path');
const fs = require("fs");

class Setting{
    constructor({ project_root, config_path = "config.json" }){
        this.project_root = project_root;
        this.config = this.getConfig(config_path);
    }

    getConfig(config_path){
        const full_path = path.join(this.project_root, config_path);
        let json = JSON.parse(fs.readFileSync(full_path));

        //  load all the template
        json['template'] = {};
        for(const prop in json['template_path']){
            const template_str = fs.readFileSync(json['template_path'][prop], { encoding: "utf-8" }).replace(/\r\n/g, '\n');

            json['template'][prop] = template_str;
        }
        delete json['template_path'];
        
        return json;
    }
}

module.exports = { Setting };