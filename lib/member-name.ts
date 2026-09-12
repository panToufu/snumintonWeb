import "server-only";

type MemberName = {
  name: string;
  user_type?: string | null;
};

export function findMatchingMember(inputName: string, members: MemberName[]) {
  const input = inputName.trim().toLowerCase();
  if (!input) return undefined;

  return members.find((member) => {
    const name = member.name.trim().toLowerCase();
    if (name === input) return true;
    if (!/[a-z]/.test(name) && !/[a-z]/.test(input)) return false;

    const nameParts = name.split(/\s+/);
    const inputParts = input.split(/\s+/);
    if (nameParts.slice().sort().join("") === inputParts.slice().sort().join("")) return true;
    if (nameParts.includes(input)) return true;
    return nameParts.map((part) => part[0]).join("") === input;
  });
}
