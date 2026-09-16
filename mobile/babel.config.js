// Missing entirely until now — Metro was falling back to a bare, non-Expo
// Babel config with no knowledge of this project's native libraries. That
// silently skipped the worklets transform react-native-reanimated (used
// throughout @gorhom/bottom-sheet's pan/scroll gestures, and by extension
// every bottom sheet in this app) needs to compile its animated/gesture
// code correctly — bundling still succeeded (a missing worklets transform
// doesn't error, it just leaves the functions un-compiled), but on-device
// every gesture silently did nothing: the map couldn't be panned, sheets
// couldn't be dragged or scrolled, pins didn't respond to touch.
// babel-preset-expo auto-detects react-native-reanimated/react-native-worklets
// from package.json and wires up the correct plugin — no need to list it here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
