import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { Toast } from "../components/Toast";

type Charity = {
  _id: string;
  name: string;
  description: string;
  imageUrl?: string;
  upcomingEvents?: string[];
  featured?: boolean;
};

export const CharitiesPage = () => {
  const [query, setQuery] = useState("");
  const [charities, setCharities] = useState<Charity[]>([]);
  const [selected, setSelected] = useState<Charity | null>(null);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [amount, setAmount] = useState("500");
  const [message, setMessage] = useState("");

  const loadCharities = async (q = "") => {
    const { data } = await apiClient.get("/charities", {
      params: q ? { q } : {}
    });

    const items = data.charities || [];
    setCharities(items);
    if (items.length && !selected) {
      setSelected(items[0]);
    }
  };

  useEffect(() => {
    void loadCharities();
  }, []);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    await loadCharities(query.trim());
  };

  const donate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;

    try {
      await apiClient.post(`/charities/${selected._id}/donate`, {
        donorName,
        donorEmail,
        amount: Number(amount)
      });
      setMessage("Donation submitted successfully.");
      setDonorName("");
      setDonorEmail("");
      setAmount("500");
    } catch {
      setMessage("Unable to submit donation.");
    }
  };

  return (
    <div className="grid-two">
      {message && <Toast message={message} onClose={() => setMessage("")} type={message.includes("Unable") ? "error" : "success"} />}
      <section className="panel">
        <h2>Charity Directory</h2>
        <form className="inline-form" onSubmit={search}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search charities or events" />
          <button type="submit">Search</button>
        </form>
        <div className="winner-list">
          {charities.map((charity) => (
            <article key={charity._id} className="winner-card">
              <p>
                <strong>{charity.name}</strong> {charity.featured ? "• Featured" : ""}
              </p>
              <p>{charity.description.slice(0, 120)}...</p>
              <button className="ghost-btn" onClick={() => setSelected(charity)}>
                View Profile
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Charity Profile</h2>
        {!selected && <p>Select a charity to view profile.</p>}
        {selected && (
          <>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            {selected.upcomingEvents?.length ? (
              <ul>
                {selected.upcomingEvents.map((eventName) => (
                  <li key={eventName}>{eventName}</li>
                ))}
              </ul>
            ) : (
              <p>No upcoming events listed.</p>
            )}

            <form className="stack-form" onSubmit={donate}>
              <h3>Independent Donation</h3>
              <input placeholder="Your name" value={donorName} onChange={(event) => setDonorName(event.target.value)} required />
              <input
                type="email"
                placeholder="Your email"
                value={donorEmail}
                onChange={(event) => setDonorEmail(event.target.value)}
                required
              />
              <input type="number" min={1} value={amount} onChange={(event) => setAmount(event.target.value)} required />
              <button type="submit">Donate</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
};
