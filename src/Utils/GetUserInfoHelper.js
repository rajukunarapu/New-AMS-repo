
// Helper function to extract first name and initial from user email
export const getUserInfo = (emailStr) => {
    if (!emailStr || typeof emailStr !== "string") {
        const stored = localStorage.getItem("userEmail");
        if (stored) return getUserInfo(stored);
        return { name: "User", initial: "U" };
    }
    const clean = emailStr.trim();
    if (!clean) return { name: "User", initial: "U" };

    if (clean.includes("@")) {
        const localPart = clean.split("@")[0]; // e.g., "raju.kunarapu"
        const parts = localPart.split(/[._-]/).filter(Boolean);
        if (parts.length > 1) {
            const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const last = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
            return {
                name: `${first} ${last}`,
                initial: (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
            };
        } else if (parts.length === 1) {
            const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            return {
                name: first,
                initial: parts[0].charAt(0).toUpperCase()
            };
        }
    }

    const name = clean.charAt(0).toUpperCase() + clean.slice(1);
    const initial = clean.charAt(0).toUpperCase();
    return { name, initial };
};