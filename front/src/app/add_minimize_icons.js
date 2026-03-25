const fs = require("fs");
const path = require("path");

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

walk(".", function(err, files) {
  const htmlFiles = files.filter(f => f.endsWith(".html"));
  htmlFiles.forEach(f => {
    let content = fs.readFileSync(f, "utf-8");
    
    // First, remove all existing minimize icons just to be safe
    content = content.replace(/<i class="minimize-i"[^>]*>&minus;<\/i>\s*/g, "");
    
    // Using RegExp to find blocks
    // Strategy: Split by `appMinimize`
    let parts = content.split("appMinimize");
    if (parts.length > 1) {
        let newContent = parts[0];
        for (let i = 1; i < parts.length; i++) {
            let part = parts[i];
            // Find the first `<i class="close-i"` in this part and prepend the minimize button
            let closeIconIndex = part.indexOf("<i class=\"close-i\"");
            if (closeIconIndex !== -1 && closeIconIndex < 1000) { // arbitrary limit to ensure its the same modal header
                part = part.substring(0, closeIconIndex) + 
                       `<i class="minimize-i" (click)="minDir.toggle($event)" title="Minimize">&minus;</i> ` + 
                       part.substring(closeIconIndex);
            }
            newContent += "appMinimize" + part;
        }
        content = newContent;
    }
    
    fs.writeFileSync(f, content);
  });
  console.log("Done adding icons");
});
