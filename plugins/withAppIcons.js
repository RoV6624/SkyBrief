const { withDangerousMod } = require("expo/config-plugins");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function withAppIcons(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iconSource = path.join(projectRoot, "assets", "icon.png");
      const appIconSet = path.join(
        projectRoot,
        "ios",
        config.modRequest.projectName,
        "Images.xcassets",
        "AppIcon.appiconset"
      );

      if (!fs.existsSync(iconSource)) {
        console.warn("[withAppIcons] No icon.png found at assets/icon.png");
        return config;
      }

      const sizes = [
        { name: "icon-20.png", size: 20 },
        { name: "icon-20@2x.png", size: 40 },
        { name: "icon-20@3x.png", size: 60 },
        { name: "icon-29.png", size: 29 },
        { name: "icon-29@2x.png", size: 58 },
        { name: "icon-29@3x.png", size: 87 },
        { name: "icon-40.png", size: 40 },
        { name: "icon-40@2x.png", size: 80 },
        { name: "icon-40@3x.png", size: 120 },
        { name: "icon-60@2x.png", size: 120 },
        { name: "icon-60@3x.png", size: 180 },
        { name: "icon-76.png", size: 76 },
        { name: "icon-76@2x.png", size: 152 },
        { name: "icon-83.5@2x.png", size: 167 },
      ];

      for (const { name, size } of sizes) {
        const out = path.join(appIconSet, name);
        execSync(`sips -z ${size} ${size} "${iconSource}" --out "${out}"`, {
          stdio: "pipe",
        });
      }

      const contentsJson = {
        images: [
          { filename: "icon-20@2x.png", idiom: "iphone", scale: "2x", size: "20x20" },
          { filename: "icon-20@3x.png", idiom: "iphone", scale: "3x", size: "20x20" },
          { filename: "icon-29@2x.png", idiom: "iphone", scale: "2x", size: "29x29" },
          { filename: "icon-29@3x.png", idiom: "iphone", scale: "3x", size: "29x29" },
          { filename: "icon-40@2x.png", idiom: "iphone", scale: "2x", size: "40x40" },
          { filename: "icon-40@3x.png", idiom: "iphone", scale: "3x", size: "40x40" },
          { filename: "icon-60@2x.png", idiom: "iphone", scale: "2x", size: "60x60" },
          { filename: "icon-60@3x.png", idiom: "iphone", scale: "3x", size: "60x60" },
          { filename: "icon-20.png", idiom: "ipad", scale: "1x", size: "20x20" },
          { filename: "icon-20@2x.png", idiom: "ipad", scale: "2x", size: "20x20" },
          { filename: "icon-29.png", idiom: "ipad", scale: "1x", size: "29x29" },
          { filename: "icon-29@2x.png", idiom: "ipad", scale: "2x", size: "29x29" },
          { filename: "icon-40.png", idiom: "ipad", scale: "1x", size: "40x40" },
          { filename: "icon-40@2x.png", idiom: "ipad", scale: "2x", size: "40x40" },
          { filename: "icon-76.png", idiom: "ipad", scale: "1x", size: "76x76" },
          { filename: "icon-76@2x.png", idiom: "ipad", scale: "2x", size: "76x76" },
          { filename: "icon-83.5@2x.png", idiom: "ipad", scale: "2x", size: "83.5x83.5" },
          { filename: "App-Icon-1024x1024@1x.png", idiom: "ios-marketing", scale: "1x", size: "1024x1024" },
        ],
        info: { version: 1, author: "expo" },
      };

      fs.writeFileSync(
        path.join(appIconSet, "Contents.json"),
        JSON.stringify(contentsJson, null, 2)
      );

      console.log("[withAppIcons] Generated all icon sizes and Contents.json");
      return config;
    },
  ]);
}

module.exports = withAppIcons;
