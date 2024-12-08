const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

function generateContact() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fullName = `${firstName} ${lastName}`;

  // Randomly generate a nickname
  const aliases = Math.random() < 0.3 ? faker.person.firstName() : null;

  // Generate fake phone numbers (always one)
  const telephone = [`"${faker.phone.number()}"`];

  // Generate fake emails (1 or 2 emails)
  const email = Array.from({ length: Math.random() < 0.7 ? 1 : 2 }, () =>
    `"${faker.internet.email(firstName, lastName)}"`
  );

  // Occasionally generate an address
  const addresses =
    Math.random() < 0.4 ? [`"${faker.location.streetAddress(true)}"`] : [];

  // Occasionally generate a birthday
  const birthday = Math.random() < 0.5 ? faker.date.birthdate({ mode: 'year' }).toISOString().split('T')[0] : null;

  // Markdown content
  const content = `---
name: ${fullName}
aliases: ${aliases || ''}
telephone:
  - ${telephone.join('\n  - ')}
email:
  - ${email.join('\n  - ')}
addresses:
  - ${addresses.join('\n  - ')}
birthday: ${birthday || ''}
---

# ${fullName}
`;

  return { fullName, content };
}

function generateContactsByLetter() {
  const contactsDir = path.join(__dirname, 'Contacts');
  if (!fs.existsSync(contactsDir)) {
    fs.mkdirSync(contactsDir);
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  alphabet.split('').forEach(letter => {
    // Generate an uneven distribution of contacts for each letter
    const numContacts = Math.floor(Math.random() * 5) + 1; // 1 to 5 contacts per letter
    for (let i = 0; i < numContacts; i++) {
      const { fullName, content } = generateContact();
      const fileName = `${fullName}.md`;
      const filePath = path.join(contactsDir, fileName);
      fs.writeFileSync(filePath, content);
    }
  });

  console.log('Contacts generated in the "Contacts" folder.');
}

generateContactsByLetter();

