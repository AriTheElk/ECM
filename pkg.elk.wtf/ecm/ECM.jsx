import React, { useState, useEffect, useCallback, Fragment } from "react";
import { readFrontmatter } from "./sugar";

const Modal = ({ children, isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return isOpen
    ? createPortal(
        <div className="modal-container mod-dim">
          <div
            className="modal-bg"
            style={{ opacity: 0.85 }}
            onClick={onClose}
          ></div>
          <div className="modal">
            <div className="modal-content">{children}</div>
            <button onClick={onClose}>Close</button>
          </div>
        </div>,
        document.body
      )
    : null;
};

const validateSemver = (version) => {
  const [major, minor, patch] = version.split(".");
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error("Invalid version format");
  }
};

const readSemver = (version) => {
  validateSemver(version);
  const [major, minor, patch] = version.split(".");
  return { major, minor, patch };
};

const isUpgrade = (current, latest) => {
  const currentSemver = readSemver(current);
  const latestSemver = readSemver(latest);

  if (latestSemver.major > currentSemver.major) return true;
  if (latestSemver.minor > currentSemver.minor) return true;
  if (latestSemver.patch > currentSemver.patch) return true;

  return false;
};

const satisfies = (current, target) => {
  const currentSemver = readSemver(current);
  const targetSemver = readSemver(target);

  if (targetSemver.major !== currentSemver.major) return false;
  if (targetSemver.minor !== currentSemver.minor) return false;

  return true;
};

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
   *
   * If it's already installed, we need to check if it's a
   * compatible version.
   */
  const checkDependency = useCallback(
    async (manifest) => {
      console.log(`Fetching dependency manifest`, manifest);
      const response = await fetch(manifest);
      const { name } = await response.json();

      console.log(`Checking if ${name} is already installed`);

      const component = components.find(
        (c) => c.name === name || c.requires.find((r) => r.name === name)
      );
      const dependency = component.requires.find((r) => r.name === name);
      if (!component || !dependency) {
        console.log(`Component ${name} not found`);
        return false;
      }

      console.log(`Found candidate`, component, dependency);

      const version = dependency ? dependency.version : component.version;

      console.log(`Found component`, component, version);

      if (!satisfies(component.version, version)) {
        console.log(`Component ${name} is not compatible, skipping`);
        return false;
      }

      return true;
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
      if (!component) return;
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
      data["components"] = data["components"].filter(Boolean).map((c) => {
        if (updatedComponents.find((u) => u.name === c.name)) {
          return updatedComponents.find((u) => u.name === c.name);
        }
        return c;
      });
      return data;
    });
    await updateIndex(updatedComponents);
    loadManifest();
  };

  /**
   * Checks for updates to the components in the manifest file.
   * This checks for updates on all components, not their dependencies.
   */
  const checkUpdates = async () => {
    console.log(`Checking for updates`);
    const updatedComponents = [];

    for (const component of components) {
      const response = await fetch(component.manifest);
      const manifest = await response.json();

      if (!manifest.version) {
        console.log(`Manifest missing version, skipping`);
        continue;
      }

      if (!isUpgrade(component.version, manifest.version)) {
        console.log(`Component ${component.name} is up to date, skipping`);
        continue;
      }

      console.log(`Component ${component.name} has an update`);
      updatedComponents.push(manifest);
    }

    console.log(`Updates checked`);

    return updatedComponents;
  };

  /**
   * Adds a new component to the manifest file and downloads the component code.
   *
   * @returns {Promise<void>} A promise that resolves when the component is added
   */
  const addComponent = async (manifestUrl) => {
    console.log(`Adding component from ${manifestUrl}`);
    const response = await fetch(manifestUrl);
    const manifest = await response.json();
    console.log(`Received manifest`, manifest, manifest.name);

    if (!manifest.name || !manifest.version || !manifest.source) {
      throw new Error("Invalid manifest format");
    }

    let requirements = [];

    for (const requirement of manifest.requires || []) {
      if (await checkDependency(requirement.manifest)) {
        console.log(`Requirement ${requirement.name} already exists, skipping`);
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

  /**
   * Downloads and installs the latest version of a component.
   * Also checks the latest version's dependency list and
   * installs or updates them if necessary.
   */
  const updateComponent = async (name) => {
    const component = components.find((c) => c.name === name);
    let updatedComponent = component;
    if (!component) {
      console.log(`Component ${name} not found`);
      return;
    }

    const response = await fetch(component.manifest);
    const manifest = await response.json();

    if (!manifest.version) {
      console.log(`Manifest missing version, skipping`);
      return;
    }

    if (!isUpgrade(component.version, manifest.version)) {
      console.log(`Component ${name} is up to date, skipping`);
      return;
    }

    console.log(`Updating component ${name}`);

    if (manifest.requires) {
      for (const requirement of manifest.requires) {
        if (await checkDependency(requirement.manifest)) {
          console.log(
            `Requirement ${requirement.name} already exists, checking version`
          );
          const existingRequirement = components.find(
            (c) => c.name === requirement.name
          );
          if (
            existingRequirement &&
            !satisfies(existingRequirement.version, requirement.version)
          ) {
            console.log(
              `Requirement ${requirement.name} is not compatible, updating`
            );
            const updatedRequirements = await updateComponent(requirement.name);
            updatedComponent = {
              ...updatedComponent,
              requires: updatedRequirements,
            };
          }
        }
      }
    }

    const componentResponse = await fetch(manifest.source);
    const componentCode = await componentResponse.text();

    console.log(`Updating component file`);

    const file = app.vault.getAbstractFileByPath(component.filePath);
    await app.vault.modify(file, componentCode);

    console.log(`Component file updated at ${file.path}`);

    updatedComponent = {
      ...updatedComponent,
      version: manifest.version,
    };

    delete updatedComponent.update;

    console.log(`Component ${name} updated`);

    return updatedComponent;
  };

  /**
   * Recursively renders the dependencies of a component.
   */
  const renderDependencies = (component) => {
    if (!component.requires) return null;

    return (
      <ul>
        {component.requires.filter(Boolean).map((requirement) => (
          <li key={requirement.name}>
            {requirement.name}@{requirement.version}
            {renderDependencies(requirement)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div>
      <h1>Emera Component Manager</h1>
      <button
        onClick={async () => {
          const updates = await checkUpdates();
          console.log(`Updates`, updates);

          const updatedComponents = components.map((component) => {
            if (updates.find((u) => u.name === component.name)) {
              return { ...component, update: true };
            }
            return component;
          });

          setComponents(updatedComponents);
        }}
        style={{ marginRight: "1rem" }}
      >
        Check for Updates
      </button>
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
                try {
                  const newComponent = await addComponent(manifestUrl);

                  console.log(`Received new component`, newComponent);

                  await updateManifest([...components, newComponent]);

                  console.log(`Component added successfully`);

                  setModalOpen(false);
                  setManifestUrl("");
                } catch (e) {
                  console.log(e);
                  setError(e.message || "Failed to add component");
                }
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
          <Fragment key={component.filePath}>
            <li>
              {component.name}@{component.version}
              {` `}
              {component.update && (
                <>
                  <strong>Update available</strong>
                  {` `}
                  <a
                    onClick={async () => {
                      const updatedComponent = await updateComponent(
                        component.name
                      );
                      const updatedComponents = components.map((c) =>
                        c.name === component.name ? updatedComponent : c
                      );
                      setComponents(updatedComponents);
                      await updateManifest(updatedComponents);
                    }}
                  >
                    Update
                  </a>
                  {` `}
                </>
              )}
              {` [ `}
              {component.protected ? (
                <strong>🔒</strong>
              ) : (
                <>
                  <a onClick={() => deleteComponent(component.name)}>Delete</a>
                </>
              )}
              {` ]`}
              {renderDependencies(component)}
            </li>
          </Fragment>
        ))}
      </ul>
    </div>
  );
};
