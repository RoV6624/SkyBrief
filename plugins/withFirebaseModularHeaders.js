const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin to fix Firebase non-modular header errors on Xcode 16+.
 *
 * When use_frameworks! is enabled (required for Firebase), Xcode's explicit
 * precompiled modules treat non-modular includes as errors. This plugin
 * injects a post_install snippet that:
 *   1. Sets CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES on all pods
 *   2. Adds -Wno-non-modular-include-in-framework-module to RNFB targets
 */
function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      const snippet = `
    # [withFirebaseModularHeaders] Fix non-modular header errors for Firebase + Xcode 16+
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
      if target.name.start_with?('RNFB')
        target.build_configurations.each do |bc|
          flags = bc.build_settings['OTHER_CFLAGS'] || '$(inherited)'
          unless flags.include?('-Wno-non-modular-include-in-framework-module')
            bc.build_settings['OTHER_CFLAGS'] = "\#{flags} -Wno-non-modular-include-in-framework-module"
          end
        end
      end
    end
`;

      // Inject after the react_native_post_install(...) call inside post_install
      const marker = "react_native_post_install(";
      const markerIdx = podfile.indexOf(marker);

      if (markerIdx !== -1) {
        // Find the closing ) of react_native_post_install by counting parens
        let depth = 0;
        let i = markerIdx + marker.length - 1; // start at the opening (
        for (; i < podfile.length; i++) {
          if (podfile[i] === "(") depth++;
          else if (podfile[i] === ")") {
            depth--;
            if (depth === 0) break;
          }
        }
        // Insert after the closing ) and any trailing newline
        let insertAt = i + 1;
        if (podfile[insertAt] === "\n") insertAt++;
        podfile =
          podfile.slice(0, insertAt) + snippet + podfile.slice(insertAt);
      }

      fs.writeFileSync(podfilePath, podfile, "utf8");
      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
