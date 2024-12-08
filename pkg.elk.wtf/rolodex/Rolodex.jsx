import React, {
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  useDebouceState,
  useIsScrolled,
  useScrollPosition,
  useScrollWidth,
  useSize,
} from "./utility-hooks";
import { ScrollView } from "./ScrollView";

const DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GRADIENT_WIDTH = 64;
const GRADIENT_BUFFER = 16;

const navigationContainer = {
  position: "relative",
  display: "flex",
  flexWrap: "nowrap",
  marginBottom: "1rem",
  width: "100%",
};

const letterLink = {
  textDecoration: "none",
  padding: "0.5rem",
  fontSize: "1.2rem",
};

const letterLinkActive = {
  ...letterLink,
  fontWeight: "bold",
  cursor: "default",
  backgroundColor: "var(--background-secondary)",
  borderRadius: 4,
  color: "var(--text-normal)",
};

const searchContainer = {
  display: "flex",
  justifyContent: "center",
  width: "100%",
  padding: "0.5rem",
  marginBottom: "1rem",
};

const searchInput = {
  width: "100%",
  padding: "0.5rem",
};

const Search = ({ onSearch }) => {
  const [rawInput, setRawInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useDebouceState(rawInput, 500);

  useEffect(() => {
    onSearch(debouncedInput);
  }, [debouncedInput, onSearch]);

  return (
    <div style={searchContainer}>
      <input
        style={searchInput}
        type="text"
        value={rawInput}
        onChange={(e) => {
          setRawInput(e.target.value);
          setDebouncedInput(e.target.value);
        }}
        placeholder="Search..."
      />
    </div>
  );
};

const Navigation = ({ alphabet, activeLetter, onLetterClick, onSearch }) => {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        backgroundColor: "var(--background-primary)",
      }}
    >
      <ScrollView style={navigationContainer}>
        {alphabet.split("").map((letter, i) => (
          <a
            key={i}
            class="mono"
            href={activeLetter === letter ? "#" : `#${letter}`}
            onClick={() => onLetterClick(letter)}
            style={{
              ...letterLink,
              ...(activeLetter === letter ? letterLinkActive : {}),
            }}
          >
            {letter}
          </a>
        ))}
      </ScrollView>
      <Search onSearch={onSearch} />
    </div>
  );
};

const getContactsByLetter = (folder, letter) => {
  const contacts = app.vault
    .getFiles()
    .filter(
      (file) => file.parent.path === folder && file.name.startsWith(letter)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return contacts;
};

const getContactsBySearch = (folder, search) => {
  const contacts = app.vault
    .getFiles()
    .filter(
      (file) =>
        file.parent.path === folder &&
        file.name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return contacts;
};

export const Rolodex = ({ folder, alphabet = DEFAULT_ALPHABET }) => {
  const cachedContacts = useRef({});
  const [activeLetter, setActiveLetter] = useState(alphabet[0]);
  const [activeSearch, setActiveSearch] = useState("");
  const pageScroller = document.querySelector(".markdown-preview-view");

  const contacts = useMemo(() => {
    if (activeSearch) {
      return getContactsBySearch(folder, activeSearch);
    }
    if (!cachedContacts.current[activeLetter]) {
      cachedContacts.current[activeLetter] = getContactsByLetter(
        folder,
        activeLetter
      );
    }
    return cachedContacts.current[activeLetter];
  }, [activeLetter, activeSearch, folder]);

  const handleLetterClick = useCallback((letter) => {
    setActiveLetter(letter);
    pageScroller.scrollTop = 0;
  }, []);

  return (
    <div>
      <Navigation
        alphabet={alphabet}
        activeLetter={activeLetter}
        onLetterClick={handleLetterClick}
        onSearch={setActiveSearch}
      />

      <ul>
        {contacts.map((contact) => (
          <li key={contact.path}>
            <a
              onClick={(e) => {
                e.preventDefault();
                app.workspace.openLinkText(contact.path, "/", false);
              }}
            >
              {contact.basename}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
