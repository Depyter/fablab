// src/lib/mock-data.ts
export const MOCK_SERVICES = [
  {
    id: "1",
    images: ["/fablab_mural.png", "/fablab_mural.png", "/fablab_mural.png", "/fablab_mural.png"],
    title: "3D Printing Service",
    description: "Professional 3D printing service offering FDM and resin printing in various materials. Perfect for prototyping, product development, custom parts, and creative projects.",
    regularPrice: 3.00,
    discountedPrice: 2.00,
    unit: "min",
    status: "Available",
    requirements: ["Requirement 1", "Requirement 2", "Requirement 3"],
    machines: ["Machine 1", "Machine 2", "Machine 3"],
    projects: ["/project-1.png", "/project-1.png", "/project-1.png"]
  },
  {
    id: "2",
    images: ["/fablab_mural.png", "/fablab_mural.png", "/fablab_mural.png"],
    title: "Laser Cutting Service",
    description: "Precision laser cutting service for various materials including wood, acrylic, and fabric.",
    regularPrice: 20.00,
    discountedPrice: 15.00,
    unit: "min",
    status: "Available",
    requirements: ["Vector file (.svg/.dxf)", "Material check"],
    machines: ["Laser Cutter Pro 400"],
    projects: []
  },
];