import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Markdown, useStorage } from "emera";
import { readFrontmatter } from "./sugar";

const CACHE_SIZE = 5;

/**
 * Reads through all the obsidian notes at the path
 * and returns a timeline of the notes. Determines the
 * date of the note by the `property`, read from the
 * frontmatter of the note.
 *
 * @param {string} path - The path to search for notes
 * @param {string} property - The frontmatter property to use as the date
 * @param {string} sort - The sort order [asc, desc]
 */
export const Timelinear = ({ path, property, sort = "" }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [cachedNotes, setCachedNotes] = useStorage("notes", []);
  const [notes, setNotes] = useState(cachedNotes);

  useEffect(() => {
    const init = async () => {
      let notes = [];

      notes = await Promise.all(
        app.vault
          .getMarkdownFiles()
          .filter((file) => file.path.startsWith(path))
          .map(async (file) => {
            const frontmatter = await readFrontmatter(file);
            const content = await app.vault.cachedRead(file);
            const date = frontmatter[property];
            return {
              path: file.path,
              title: frontmatter.title ?? file.basename ?? "Untitled",
              content,
              date,
            };
          })
      );

      const sortedNotes = notes.sort((a, b) => {
        if (sort.toLowerCase() === "asc") {
          return new Date(a.date) - new Date(b.date);
        } else {
          return new Date(b.date) - new Date(a.date);
        }
      });

      setNotes(sortedNotes);
      // cache the first MAX_SIZE notes
      setCachedNotes(sortedNotes.slice(0, CACHE_SIZE));
      setIsLoading(false);
    };

    init();
  }, [path]);

  return (
    <div style={{ position: "relative", marginBottom: "2rem" }}>
      {isLoading && <p>Loading...</p>}
      <ul className="timeline">
        {notes.map((note) => (
          <li className="timeline-event" key={note.path}>
            <label className="timeline-event-icon"></label>
            <div className="timeline-event-content">
              <p className="timeline-event-time">{note[property]}</p>
              <Markdown>{`### [[${note.path}|${note.title}]]`}</Markdown>
              <br />
              <Markdown>{note.content}</Markdown>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
