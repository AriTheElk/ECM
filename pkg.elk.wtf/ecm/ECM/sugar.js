export const readFrontmatter = async (file) => {
  return new Promise((resolve) => {
    app.fileManager.processFrontMatter(file, (frontmatter) => {
      resolve(frontmatter);
    });
  });
};

/**
 * Hook to get files from a specific path
 * @param {string} path
 */
export const useFiles = (path) =>
  app.vault.getFiles().filter((file) => file.path.startsWith(path));

/**
 * Hook to get markdown files from a specific path
 * @param {string} path
 */
export const useMarkdownFiles = (path) =>
  app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(path));

/**
 * Hook for accessing frontmatter in files
 * @param  {...Array} files - The files to read frontmatter from
 * @returns {object} - The frontmatter of the files
 */
export const useFrontmatter = (...files) => {
  const [frontmatter, setFrontmatter] = useState({});

  useEffect(() => {
    const init = async () => {
      const frontmatter = await Promise.all(
        files.map(async (file) => {
          return await readFrontmatter(file);
        })
      );

      const frontmatterObject = frontmatter.reduce((acc, curr, idx) => {
        acc[files[idx].path] = curr;
        return acc;
      }, {});

      setFrontmatter(frontmatterObject);
    };

    init();
  }, files);

  return frontmatter;
};

/**
 * Hook for accessing the content of a file
 *
 * @param {string} file - The file to read content from
 * @returns {string} - The content of the file
 */
export const useFileContent = (file) => {
  const [content, setContent] = useState("");

  useEffect(() => {
    const init = async () => {
      setContent(await app.vault.cachedRead(file));
    };

    init();
  }, [file]);

  return content;
};
