import React, { createContext, useContext, useState } from 'react';

const DatingContext = createContext();

export const initialProfiles = [
  {
    id: 5,
    name: "The Chronicles of Autumn",
    author: "Alexander Thorne",
    format: "Édition Vidéo & Reliure Cuir",
    price: 2500,
    video: "/assets/videos/book-trailer.mp4",
    image: "/assets/images/books/book1.jpg",
    bio: "Une épopée poétique illustrée au cœur des légendes d'automne. Ce grimoire d'exception vous plonge dans un univers médiéval mystique, entre enluminures dorées, contes oubliés et contemplation au coin du feu.",
    location: "Éditions du Grimoire",
    distance: "10s Vidéo",
    interests: ["Poésie", "Grimoire", "Fantasy", "Reliure Cuir"],
    languages: ["Français", "English"],
  },
  {
    id: 1,
    name: "The Art of Whispers",
    author: "Éléonore Vance",
    format: "Recueil Poétique & Dorures",
    price: 1850,
    image: "/assets/images/books/book2.jpg",
    bio: "Un voyage poétique et contemplatif explorant les pensées secrètes et les songes de l'âme. Relié de dorures précieuses, ce chef-d'œuvre invite au calme et à la rêverie littéraire au coin du feu.",
    location: "Éditions Poesis",
    distance: "Livre Relié",
    interests: ["Poésie", "Classique", "Dorures"],
    languages: ["Français", "English"],
  },
  {
    id: 2,
    name: "Les Chroniques Oubliées",
    author: "Julien Mercier",
    format: "Roman Historique & Mystère",
    price: 2300,
    image: "/assets/images/books/book2.jpg",
    bio: "Partez à la découverte de secrets enfouis au cœur des bibliothèques sacrées de l'Antiquité. Une quête initiatique captivante qui ravira tous les passionnés d'histoire, d'énigmes et de vieux manuscrits.",
    location: "Éditions Historia",
    distance: "Grand Format",
    interests: ["Histoire", "Mystère", "Aventure"],
    languages: ["Français"],
  },
  {
    id: 3,
    name: "The Whispering Oak",
    author: "Arthur Pendelton",
    format: "Roman Fantastique Broché",
    price: 2100,
    image: "/assets/images/books/book3.jpg",
    bio: "Plongez au cœur d'une forêt ancestrale magique, où chaque murmure raconte une légende oubliée. Guidé par la lueur d'une bougie, découvrez les secrets millénaires cachés sous le grand chêne.",
    location: "Éditions Sylvestre",
    distance: "Roman Broché",
    interests: ["Fantasy", "Nature", "Légendes"],
    languages: ["Français", "English"],
  },
  {
    id: 4,
    name: "Le Chant du Silence",
    author: "Sarah Lindqvist",
    format: "Méditation & Poésie",
    price: 1950,
    image: "/assets/images/books/book1.jpg",
    bio: "Méditation poétique sur les mots et la sérénité. Un recueil intime et apaisant qui célèbre la beauté de la solitude et le réconfort de la lecture au calme en toute harmonie.",
    location: "Éditions Sérénité",
    distance: "Poche Collector",
    interests: ["Philosophie", "Méditation", "Bien-être"],
    languages: ["Français"],
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
