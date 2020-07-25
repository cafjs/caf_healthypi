#!/bin/bash
#build app
pushd public
echo "browserify  -d js/main.js -o js/build.js"
browserify  -d js/main.js -o js/build.js
echo "browserify js/main.js | uglifyjs > js/build.min.js"
export NODE_ENV=production
browserify js/main.js | uglifyjs > js/build.min.js
unset NODE_ENV


#build user view
pushd user
echo "browserify  -d js/main.js -o js/build.js"
browserify  -d js/main.js -o js/build.js
echo "browserify js/main.js | uglifyjs > js/build.min.js"
export NODE_ENV=production
browserify js/main.js | uglifyjs > js/build.min.js
unset NODE_ENV
popd #user

popd #public

#build iot
pushd iot
cafjs pack true . ./app.tgz &&  mv ./app.tgz ../public/iot.tgz

# browserify iot
cafjs mkStatic
echo "browserify --ignore ws -d . -o ../public/js/build-iot.js"
browserify --ignore ws -d . -o ../public/js/build-iot.js
echo "browserify --ignore ws . | uglifyjs > ../public/js/build-iot.min.js"
export NODE_ENV=production
browserify  --ignore ws . | uglifyjs > ../public/js/build-iot.min.js
unset NODE_ENV
# rm staticArtifacts.js
rm -fr node_modules/*;
popd #iot
