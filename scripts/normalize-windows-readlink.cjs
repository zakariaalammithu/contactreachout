/*
 * Some Windows removable/exFAT-style filesystems report EISDIR when readlink
 * is called on an ordinary file. Node and Webpack expect EINVAL for that case.
 * Normalize only that incorrect error during local builds; real symlink and
 * filesystem errors retain their original behavior.
 */
const fs = require('node:fs');

function normalizeReadlinkError(error) {
  if (error && error.code === 'EISDIR') {
    error.code = 'EINVAL';
    error.errno = -4071;
  }
  return error;
}

const originalReadlink = fs.readlink;
fs.readlink = function readlink(path, options, callback) {
  if (typeof options === 'function') {
    return originalReadlink.call(fs, path, (error, value) => {
      options(normalizeReadlinkError(error), value);
    });
  }

  return originalReadlink.call(fs, path, options, (error, value) => {
    callback(normalizeReadlinkError(error), value);
  });
};

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function readlinkSync(...args) {
  try {
    return originalReadlinkSync.apply(fs, args);
  } catch (error) {
    throw normalizeReadlinkError(error);
  }
};

const originalPromiseReadlink = fs.promises.readlink.bind(fs.promises);
fs.promises.readlink = async function readlink(...args) {
  try {
    return await originalPromiseReadlink(...args);
  } catch (error) {
    throw normalizeReadlinkError(error);
  }
};
