/*
  Amarok Italia - App React collegata a Supabase
  Funzionalità:
  - Login / Registrazione
  - Discussioni con risposte e moderazione
  - Marketplace con annunci
  - Upload immagine profilo (Storage bucket: avatars)
*/

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function AmarokItaliaApp() {
  const [route, setRoute] = useState("home");
  const [dark, setDark] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [username, setUsername] = useState("");
  const [discussions, setDiscussions] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState("");
  const [listings, setListings] = useState([]);
  const [listTitle, setListTitle] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [listPrice, setListPrice] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user ?? null);
      if (data?.session?.user) loadProfile(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
    });
    loadDiscussions();
    loadListings();
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(id) {
    const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
    if (data) setProfile(data);
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    });
    if (error) return alert(error.message);
    if (data.user) {
      await supabase
        .from("profiles")
        .upsert({ id: data.user.id, username: username || data.user.email });
      loadProfile(data.user.id);
    }
  }

  async function signIn() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) return alert(error.message);
    setUser(data.user);
    loadProfile(data.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

 async function uploadAvatar(file) {
  if (!user) return alert("Devi essere loggato");
  if (!file) return alert("Nessun file selezionato");

  const fileName = `${user.id}-${file.name}`;

  // Carica il file nel bucket "avatars"
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });
  if (uploadError) return alert(uploadError.message);

  // Ottieni l'URL pubblico del file
  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
  const avatarUrl = data?.publicUrl;

  // Aggiorna il profilo
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);
  if (updateError) return alert(updateError.message);

  // Ricarica i dati del profilo
  loadProfile(user.id);
}

  async function loadDiscussions() {
    const { data } = await supabase
      .from("discussions")
      .select("*, profiles:author_id(username)")
      .order("created_at", { ascending: false });
    setDiscussions(data || []);
  }

  async function openDiscussion(disc) {
    setSelectedDiscussion(disc);
    const { data } = await supabase
      .from("replies")
      .select("*, profiles:author_id(username)")
      .eq("discussion_id", disc.id)
      .order("created_at", { ascending: true });
    setReplies(data || []);
    setRoute("discussion");
  }

  async function createDiscussion(e) {
    e.preventDefault();
    if (!user) return alert("Devi essere loggato");
    const payload = { title: newTitle, body: newBody, author_id: user.id };
    const { error } = await supabase.from("discussions").insert(payload);
    if (error) return alert(error.message);
    setNewTitle("");
    setNewBody("");
    loadDiscussions();
    setRoute("discussions");
  }

  async function createReply(e) {
    e.preventDefault();
    if (!user || !selectedDiscussion) return alert("Errore");
    const payload = {
      discussion_id: selectedDiscussion.id,
      body: newReply,
      author_id: user.id,
    };
    const { error } = await supabase.from("replies").insert(payload);
    if (error) return alert(error.message);
    setNewReply("");
    openDiscussion(selectedDiscussion);
  }

  async function removeDiscussion(id) {
    if (!profile?.is_moderator) return alert("Solo moderatori");
    const { error } = await supabase.from("discussions").delete().eq("id", id);
    if (error) return alert(error.message);
    loadDiscussions();
  }

  async function loadListings() {
    const { data } = await supabase
      .from("listings")
      .select("*, profiles:author_id(username)")
      .order("created_at", { ascending: false });
    setListings(data || []);
  }

  async function createListing(e) {
    e.preventDefault();
    if (!user) return alert("Devi essere loggato");
    const payload = {
      title: listTitle,
      description: listDesc,
      price: parseFloat(listPrice) || 0,
      author_id: user.id,
    };
    const { error } = await supabase.from("listings").insert(payload);
    if (error) return alert(error.message);
    setListTitle("");
    setListDesc("");
    setListPrice("");
    loadListings();
  }

  async function markSold(id) {
    if (!profile?.is_moderator) return alert("Solo moderatori");
    const { error } = await supabase.from("listings").update({ sold: true }).eq("id", id);
    if (error) return alert(error.message);
    loadListings();
  }

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-gray-900 text-gray-100"
          : "min-h-screen bg-gray-50 text-gray-900"
      }
    >
      <header className="max-w-5xl mx-auto p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Amarok Italia</h1>
          <div className="text-xs opacity-80">Community & Marketplace</div>
        </div>

        <nav className="space-x-3">
          <button onClick={() => setRoute("home")}>Home</button>
          <button onClick={() => setRoute("discussions")}>Discussioni</button>
          <button onClick={() => setRoute("market")}>Marketplace</button>
          <button onClick={() => setRoute("contact")}>Contatti</button>
          <button onClick={() => setDark((d) => !d)}>
            {dark ? "Chiaro" : "Scuro"}
          </button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {route === "home" && (
          <section>
            <h2 className="text-xl font-semibold">Benvenuto su Amarok Italia</h2>
            <p>
              La community degli appassionati di Amarok. Partecipa alle discussioni, compra e vendi accessori o trova la tua prossima Amarok.
            </p>

            <div className="mt-4 p-4 rounded shadow">
              {user ? (
                <div>
                  <div>
                    Loggato come{" "}
                    <strong>{profile?.username || user.email}</strong>{" "}
                    {profile?.is_moderator && <em>(Moderatore)</em>}
                  </div>

                  {/* Avatar */}
                  <div className="mt-3">
                    {profile?.avatar_url ? (
                      <img
  src={profile.avatar_url}
  alt="Avatar"
  className="w-12 h-12 rounded-full border mb-2 object-cover"
/>

                      
                    ) : (
                      <p>Nessuna foto profilo</p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => uploadAvatar(e.target.files[0])}
                    />
                  </div>

                  <button
                    onClick={signOut}
                    className="mt-3 px-3 py-1 rounded bg-red-500 text-white"
                  >
                    Esci
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold">Accedi o registrati</h3>
                  <div className="grid md:grid-cols-3 gap-2">
                    <input
                      placeholder="Email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="p-2 rounded border"
                    />
                    <input
                      placeholder="Password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="p-2 rounded border"
                      type="password"
                    />
                    <input
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="p-2 rounded border"
                    />
                  </div>
                  <div className="mt-2 space-x-2">
                    <button onClick={signIn} className="px-3 py-1 rounded bg-blue-500 text-white">
                      Accedi
                    </button>
                    <button onClick={signUp} className="px-3 py-1 rounded bg-green-600 text-white">
                      Registrati
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {route === "discussions" && (
          <section>
            <h2 className="text-xl font-semibold">Discussioni</h2>
            <form onSubmit={createDiscussion} className="mt-3 mb-4">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titolo"
                className="w-full p-2 rounded border mb-2"
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Descrivi il topic"
                className="w-full p-2 rounded border mb-2"
              />
              <button className="px-3 py-1 rounded bg-blue-600 text-white">
                Crea Topic
              </button>
            </form>

            <div className="space-y-3">
              {discussions.map((d) => (
                <div key={d.id} className="p-3 rounded shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{d.title}</h3>
                      <div className="text-xs opacity-75">
                        da {d.profiles?.username || "Anon"} •{" "}
                        {new Date(d.created_at).toLocaleString()}
                      </div>
                      <p className="mt-2 line-clamp-3">{d.body}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <button
                        onClick={() => openDiscussion(d)}
                        className="px-2 py-1 rounded bg-gray-200"
                      >
                        Apri
                      </button>
                      {profile?.is_moderator && (
                        <button
                          onClick={() => removeDiscussion(d.id)}
                          className="px-2 py-1 rounded bg-red-400 text-white"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {route === "discussion" && selectedDiscussion && (
          <section>
            <button
              onClick={() => setRoute("discussions")}
              className="mb-2 underline"
            >
              ← Torna
            </button>
            <h2 className="text-xl font-semibold">{selectedDiscussion.title}</h2>
            <p className="opacity-80">{selectedDiscussion.body}</p>

            <div className="mt-4">
              <h3 className="font-semibold">Risposte</h3>
              <div className="space-y-2 mt-2">
                {replies.map((r) => (
                  <div key={r.id} className="p-2 rounded border">
                    <div className="text-xs opacity-75">
                      {r.profiles?.username} •{" "}
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div>{r.body}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={createReply} className="mt-3">
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  className="w-full p-2 rounded border"
                  placeholder="Scrivi la tua risposta..."
                />
                <button className="mt-2 px-3 py-1 rounded bg-blue-600 text-white">
                  Rispondi
                </button>
              </form>
            </div>
          </section>
        )}

        {route === "market" && (
          <section>
            <h2 className="text-xl font-semibold">Marketplace</h2>
            <form onSubmit={createListing} className="mt-3 mb-4">
              <input
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                placeholder="Titolo annuncio"
                className="w-full p-2 rounded border mb-2"
              />
              <textarea
                value={listDesc}
                onChange={(e) => setListDesc(e.target.value)}
                placeholder="Descrizione"
                className="w-full p-2 rounded border mb-2"
              />
              <input
                value={listPrice}
                onChange={(e) => setListPrice(e.target.value)}
                placeholder="Prezzo"
                className="w-full p-2 rounded border mb-2"
              />
              <button className="px-3 py-1 rounded bg-green-600 text-white">
                Pubblica Annuncio
              </button>
            </form>

            <div className="space-y-3">
              {listings.map((l) => (
                <div key={l.id} className="p-3 rounded shadow">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {l.title}{" "}
                        {l.sold && <span className="text-sm opacity-70">(Venduto)</span>}
                      </h3>
                      <div className="text-xs opacity-75">
                        {l.profiles?.username} •{" "}
                        {new Date(l.created_at).toLocaleString()}
                      </div>
                      <p className="mt-2">{l.description}</p>
                      <div className="mt-2 font-semibold">€ {l.price}</div>
                    </div>
                    {profile?.is_moderator && !l.sold && (
                      <button
                        onClick={() => markSold(l.id)}
                        className="px-2 py-1 rounded bg-blue-500 text-white"
                      >
                        Segna Venduto
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {route === "contact" && (
          <section>
            <h2 className="text-xl font-semibold">Contatti</h2>
            <p>
              Per info o partnership scrivi a <strong>info@amarokitalia.example</strong>
            </p>
          </section>
        )}
      </main>

      <footer className="max-w-5xl mx-auto p-4 text-sm opacity-80 text-center">
        © {new Date().getFullYear()} Amarok Italia
      </footer>
    </div>
  );
}
