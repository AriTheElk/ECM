import { useEffect, useState } from "react";

const VALID_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp"];
const VALID_VIDEO_EXTENSIONS = ["mp4", "webm"];

const renameFile = async (file, newName) => {
  const fileExtension = file.extension;
  const newFileName = `${newName}.${fileExtension}`;
  const newFilePath = `${file.parent.path}/${newFileName}`;
  const oldFileName = file.name; // Includes the extension

  try {
    let changes = 0;
    const regex = new RegExp(`(\\!\\[\\[|\\[\\[)${oldFileName}(\\]\\])`, "g");
    // Step 1: Rename the file
    await app.vault.rename(file, newFilePath);

    // Step 2: Find and update all references to the old file name
    const allFiles = app.vault.getMarkdownFiles();
    for (const mdFile of allFiles) {
      const content = await app.vault.read(mdFile);

      // Check if the file is referenced in the markdown content
      if (
        content.includes(`![[${oldFileName}]]`) ||
        content.includes(`[[${oldFileName}]]`) ||
        content.includes(`![[${file.path}]`) ||
        content.includes(`[[${file.path}]`)
      ) {
        const updatedContent = content.replace(regex, `$1${newFileName}$2`);

        // Update the markdown file if the content has changed
        if (updatedContent !== content) {
          changes++;
          await app.vault.modify(mdFile, updatedContent);
        }
      }
    }

    new Notice(
      `Renamed file to ${newFilePath} and updated ${changes} references.`
    );
  } catch (err) {
    console.error(err);
    new Notice(
      "An error occurred while renaming the file. Check the console for more details."
    );
  }
};

const tableStyles = {
  width: "100%",
  tableLayout: "fixed",
  borderCollapse: "collapse",
  height: "100%",
};

const mediaCellStyle = {
  width: "50%", // Ensure both cells take up 50% of the table's width
  textAlign: "center",
  verticalAlign: "top", // Align content at the top
};

const controlCellStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center", // Center content vertically
  alignItems: "center",
  gap: "8px",
  height: "100%", // Make sure it stretches to the full row height
};

const mediaStyle = {
  maxWidth: "100%",
  maxHeight: "80vh", // Limit height as specified
  objectFit: "contain", // Scale media properly within the cell
};

const renameContainerStyle = {
  marginTop: "8px",
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const inputStyle = {
  flex: 1,
};

const buttonStyle = {
  marginBottom: 0,
};

/**
 * Renders either an image or video based on the file extension.
 */
const Media = ({ file }) => {
  const extension = file.extension;
  const [newName, setNewName] = useState(
    file.name.replace(`.${extension}`, "")
  ); // Remove extension from the displayed name

  const handleRename = () => {
    if (newName.trim() === "") {
      alert("File name cannot be empty!");
      return;
    }
    const newPath = `${file.path.substring(
      0,
      file.path.lastIndexOf("/") + 1
    )}${newName}.${extension}`;
    if (newPath === file.path) {
      alert("New name is the same as the current name!");
      return;
    }
    renameFile(file, newName);
  };

  return (
    <div>
      {VALID_IMAGE_EXTENSIONS.includes(extension) ? (
        <img
          src={app.vault.adapter.getResourcePath(file.path)}
          alt={file.name}
          style={mediaStyle}
        />
      ) : VALID_VIDEO_EXTENSIONS.includes(extension) ? (
        <video controls style={mediaStyle}>
          <source
            src={app.vault.adapter.getResourcePath(file.path)}
            type={`video/${extension}`}
          />
        </video>
      ) : (
        <p>Unsupported file type: {extension}</p>
      )}
      <div style={renameContainerStyle}>
        <form onSubmit={(e) => e.preventDefault() || handleRename()}>
          <input
            style={inputStyle}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button style={buttonStyle} type="submit">
            Rename
          </button>
        </form>
      </div>
    </div>
  );
};

export const MediaManager = ({ directory }) => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // Fetch all files in the vault
    const allFiles = app.vault.getFiles();
    // Filter files to only include those in the specified directory
    const filteredFiles = allFiles
      .filter((file) => file.path.startsWith(directory))
      .sort((a, b) => a.name.localeCompare(b.name));
    setFiles(filteredFiles);
  }, [directory]);

  const openFile = (filePath) => {
    // Open the file in Obsidian
    app.workspace.openLinkText(filePath, "/", false);
  };

  const deleteFile = (file) => {
    // Confirm and delete the file
    if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      app.vault.delete(file);
      setFiles((prevFiles) => prevFiles.filter((f) => f.path !== file.path));
    }
  };

  const refreshFiles = () => {
    // Refresh the file list
    const allFiles = app.vault.getFiles();
    const filteredFiles = allFiles.filter((file) =>
      file.path.startsWith(directory)
    );
    setFiles(filteredFiles);
  };

  return (
    <table style={tableStyles}>
      <thead>
        <tr>
          <th>Media</th>
          <th>Controls</th>
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr key={file.path}>
            <td style={mediaCellStyle}>
              <Media file={file} onRename={refreshFiles} />
            </td>
            <td style={controlCellStyle}>
              <button onClick={() => openFile(file.path)}>Open</button>
              <button onClick={() => deleteFile(file)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
