PHOTOS — INSTRUCTIONS
======================

Place your photos here to show them in the Memory Wall.

Supported formats: .jpg, .jpeg, .png, .webp

After adding photos, update src/config.ts:

  memoryWall: {
    photos: [
      { src: "/photos/photo1.jpg", caption: "Our first adventure", rotate: -3 },
      { src: "/photos/photo2.jpg", caption: "That magical day",   rotate:  4 },
      ...
    ]
  }

If no src is provided, the emoji placeholder will be shown instead.
