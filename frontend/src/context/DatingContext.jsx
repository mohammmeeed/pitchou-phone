import React, { createContext, useContext, useState } from 'react';

const DatingContext = createContext();

export const initialProfiles = [
  {
    id: 1,
    name: "Richard",
    age: 22,
    location: "Montreal, Canada",
    distance: "5 miles away",
    image: "/assets/images/books/book1.jpg",
    bio: "The Art of Whispers – A Collection of Poems & Reveries. Un voyage poétique et mystique explorant les pensées secrètes et les songes de l'âme. Relié de dorures précieuses, ce chef-d'œuvre invite au calme et à la rêverie au coin du feu.",
    badge: "",
    interests: ["Reading", "Literature", "Coffee", "Novels"],
    languages: ["English", "French"],
  },
  {
    id: 2,
    name: "Lisa Ray",
    age: 25,
    location: "New York, USA",
    distance: "2 miles away",
    image: "/assets/images/books/book2.jpg",
    bio: "Les Chroniques Oubliées – Mystères littéraires anciens. Partez à la découverte de secrets enfouis au cœur des bibliothèques sacrées. Une quête initiatique captivante qui ravira tous les passionnés d'histoire et de vieux manuscrits.",
    badge: "",
    interests: ["Classic Books", "Poetry", "Bookstores"],
    languages: ["English", "Spanish"],
  },
  {
    id: 3,
    name: "Miselia",
    age: 24,
    location: "Toronto, Canada",
    distance: "8 miles away",
    image: "/assets/images/books/book3.jpg",
    bio: "The Whispering Oak – A Tale of Golden Dreams. Plongez au cœur d'une forêt ancestrale magique, où chaque murmure raconte une légende oubliée. Guidé par la lueur d'une bougie, découvrez les secrets millénaires cachés sous le grand chêne.",
    badge: "",
    interests: ["Novels", "Philosophy", "Writing", "Art"],
    languages: ["English", "German"],
  },
  {
    id: 4,
    name: "Chelsea",
    age: 21,
    location: "Boston, USA",
    distance: "4 miles away",
    image: "/assets/images/books/book1.jpg",
    bio: "Le Chant du Silence – Méditation poétique sur les mots. Un recueil intime et apaisant qui célèbre la beauté de la solitude et le réconfort des livres. Une invitation lumineuse à ralentir et savourer l'instant présent en toute sérénité.",
    badge: "",
    interests: ["Study", "Travelling", "Reading"],
    languages: ["English", "Italian"],
  }
];

export const DatingProvider = ({ children }) => {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [swipedList, setSwipedList] = useState([]);
  const [likedList, setLikedList] = useState([
    { id: 101, name: "Chelsea", school: "Harvard University", image: "/assets/images/liked/pic1.png" },
    { id: 102, name: "Abby", school: "Chapman University", image: "/assets/images/liked/pic2.png" },
    { id: 103, name: "Javelle", school: "Law student at Stanford", image: "/assets/images/liked/pic3.png" },
    { id: 104, name: "Veronica", school: "Harvard University", image: "/assets/images/liked/pic4.png" },
    { id: 105, name: "Richard", school: "Law student at Stanford", image: "/assets/images/liked/pic5.png" },
  ]);

  const [matches, setMatches] = useState([
    { id: 1, name: "Grayson", image: "/assets/images/user/pic1.jpg", lastMsg: "Would love to!", time: "2m ago", active: true },
    { id: 2, name: "Matt", image: "/assets/images/user/pic2.jpg", lastMsg: "Is that because we like...", time: "4m ago", active: false },
    { id: 3, name: "Elisha", image: "/assets/images/user/pic3.jpg", lastMsg: "See you tomorrow!", time: "12m ago", active: true },
    { id: 4, name: "Mitchell", image: "/assets/images/user/pic4.jpg", lastMsg: "Hey there!", time: "1h ago", active: false },
    { id: 5, name: "Stephon", image: "/assets/images/user/pic5.jpg", lastMsg: "Let's catch up soon", time: "2h ago", active: true },
  ]);

  const [userProfile, setUserProfile] = useState({
    name: "John Doe",
    email: "example@gmail.com",
    phone: "+123 4567 890",
    gender: "Men",
    interestedIn: "Women",
    lookingFor: "Long-term partner",
    avatar: "/assets/images/user/pic1.jpg",
    age: 24,
    location: "Montreal, Canada",
  });

  const swipeCard = (id, action) => {
    setSwipedList(prev => [...prev, { id, action }]);
  };

  const resetCards = () => {
    setSwipedList([]);
  };

  return (
    <DatingContext.Provider value={{
      profiles,
      swipedList,
      swipeCard,
      resetCards,
      likedList,
      matches,
      userProfile,
      setUserProfile,
    }}>
      {children}
    </DatingContext.Provider>
  );
};

export const useDating = () => useContext(DatingContext);
