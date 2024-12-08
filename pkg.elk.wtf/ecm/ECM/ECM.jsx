import React, { useState, useEffect, useCallback } from "react";
import { readFrontmatter } from "./sugar";
import { Modal } from "../ObsidianUI";

export const ECM = ({ path }) => {
  const [components, setComponents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [manifestUrl, setManifestUrl] = useState("");
  const [error, setError] = useState("");

  const componentsDir = path;
  const manifestPath = `${componentsDir}/manifest.md`;

  useEffect(() => {
    ensureFolderExists(componentsDir);
    ensureManifestFileExists();
    loadManifest();
  }, []);

  /**
   * Checks if a component is already in the manifest.
   * As either a component or a requirement of another component.
   */
  const checkDependency = useCallback(
    (name) => {
      return components.some(
        (c) =>
          c.name === name ||
          (c.requires && c.requires.some((r) => r.name === name))
      );
    },
    [components]
  );

  /**
   * Ensures the components directory exists. If it doesn't, it creates it.
   *
   * @param {string} folderPath The path to the components directory
   * @returns {Promise<void>} A promise that resolves when the folder is created
   */
  const ensureFolderExists = useCallback(
    async (folderPath) => {
      const folder = app.vault.getAbstractFileByPath(folderPath);
      if (!folder) {
        await app.vault.createFolder(folderPath);
      }
    },
    [componentsDir]
  );

  /**
   * Updates or creates the index file to export all components
   * and their dependencies. Dependencies can have their own
   * dependencies, theoretically infinitely deep. This function
   * will recursively update the index file with all dependencies.
   *
   * Skipping components that are already in the index file.
   */
  const updateIndex = async (updatedComponents) => {
    const indexFilePath = `${componentsDir}/index.js`;

    console.log(
      `Updating index file with ${updatedComponents.length} components (and their dependencies)`
    );

    const allExports = [];

    const addExports = (component) => {
      if (allExports.includes(component.name)) {
        console.log(`Component ${component.name} already in index, skipping`);
        return;
      }

      allExports.push(component.name);

      if (component.requires) {
        for (const requirement of component.requires) {
          if (!requirement) continue;
          addExports(requirement);
        }
      }
    };

    for (const component of updatedComponents) {
      console.log(`Adding exports`, component);
      addExports(component);
    }

    console.log(`All exports: ${allExports}`);

    const exportStatements = allExports.map(
      (name) => `export * from "./${name}";`
    );

    const indexCode = exportStatements.join("\n");

    const indexFile = app.vault.getAbstractFileByPath(indexFilePath);
    if (indexFile) {
      await app.vault.modify(indexFile, indexCode);
    } else {
      await app.vault.create(indexFilePath, indexCode);
    }
  };

  /**
   * Ensures the manifest file exists. If it doesn't, it creates it with an empty components array.
   *
   * @returns {Promise<void>} A promise that resolves when the manifest file is created
   */
  const ensureManifestFileExists = useCallback(async () => {
    const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
    if (!manifestFile) {
      const initialManifest = `---\ncomponents:\n---\n`;
      await app.vault.create(manifestPath, initialManifest);
    }
  }, [manifestPath]);

  /**
   * Loads the manifest file and updates the state with the components.
   * The manifest file is a markdown file with frontmatter that looks like this:
   * ---
   * components:
   *  - name: MyComponent
   *    version: 1
   *    manifest: https://example.com/my-component/manifest.json
   *    source: https://example.com/my-component
   *    protected: false // reserved for ECM internals
   *    requires:
   *     - manifest: https://example.com/dependency/manifest.json
   *       version: 1
   * ---
   */
  const loadManifest = useCallback(async () => {
    const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
    if (manifestFile) {
      const { components } = await readFrontmatter(manifestFile);
      setComponents((components || []).filter((c) => c != null));
    }
  }, [manifestPath]);

  /**
   * Updates the manifest file with the updated components.
   *
   * @param {Object[]} updatedComponents The updated components
   * @returns {Promise<void>} A promise that resolves when the manifest is updated
   */
  const updateManifest = async (updatedComponents) => {
    const manifestFile = app.vault.getAbstractFileByPath(manifestPath);
    await app.fileManager.processFrontMatter(manifestFile, (data) => {
      data["components"] = updatedComponents;
    });
    await updateIndex(updatedComponents);
    loadManifest();
  };

  /**
   * Adds a new component to the manifest file and downloads the component code.
   *
   * @returns {Promise<void>} A promise that resolves when the component is added
   */
  const addComponent = async (manifestUrl) => {
    setError("");
    try {
      console.log(`Adding component from ${manifestUrl}`);
      const response = await fetch(manifestUrl);
      const manifest = await response.json();
      console.log(`Received manifest`, manifest);

      if (!manifest.name || !manifest.version || !manifest.source) {
        throw new Error("Invalid manifest format");
      }

      let requirements = [];

      for (const requirement of manifest.requires || []) {
        if (checkDependency(requirement.name)) {
          console.log(
            `Requirement ${requirement.name} already exists, skipping`
          );
          continue;
        }
        console.log(`Adding requirement`, requirement);
        requirements.push(await addComponent(requirement.manifest));
      }

      const componentResponse = await fetch(manifest.source);
      const componentCode = await componentResponse.text();

      console.log(`Creating component file`);

      const filePath = `${componentsDir}/${manifest.name}.jsx`;
      await app.vault.create(filePath, componentCode);

      console.log(`Component file created at ${filePath}`);

      const newComponent = {
        ...manifest,
        filePath,
        manifest: manifestUrl,
        requires: requirements,
      };

      console.log(`Added component`, newComponent);

      return newComponent;
    } catch (e) {
      setError(e.message || "Failed to add component");
    }
  };

  /**
   * Deletes a component from the manifest file and the file system.
   *
   * @param {string} name The name of the component to delete
   * @returns {Promise<void>} A promise that resolves when the component is deleted
   */
  const deleteComponent = async (name) => {
    try {
      const path = `${componentsDir}/${name}.jsx`;
      const file = app.vault.getAbstractFileByPath(path);
      await app.vault.trash(file, true);

      const updatedComponents = components.filter((c) => c.name !== name);
      setComponents(updatedComponents);

      // Update manifest
      await updateManifest(updatedComponents);
    } catch (e) {
      alert("Failed to delete component");
    }
  };

  return (
    <div>
      <h1>Emera Component Manager</h1>
      <button onClick={() => updateIndex(components)}>Update Index</button>
      <button onClick={() => setModalOpen(true)}>Add Component</button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <h2>Add Component</h2>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <input
              style={{ flex: 1 }}
              type="text"
              placeholder="Enter manifest URL"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
            />
            <button
              onClick={async () => {
                const newComponent = await addComponent(manifestUrl);

                await updateManifest([...components, newComponent]);

                console.log(`Component added successfully`);

                setModalOpen(false);
                setManifestUrl("");
              }}
            >
              Add
            </button>
          </div>
        </div>
      </Modal>

      <h2>Components</h2>
      <ul>
        {components.map((component) => (
          <li key={component.name}>
            {component.name}@{component.version}
            {` `}
            <button onClick={() => deleteComponent(component.name)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
