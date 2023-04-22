import React, { useState, useEffect } from "react";
import "./App.css";
import "@aws-amplify/ui-react/styles.css";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
  createFoodItemMutation as createFoodItemMutation,
} from "./graphql/mutations";
import { API, Storage } from "aws-amplify";
import {
  Button,
  Flex,
  Heading,
  Image,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(
      notesFromAPI.map(async (note) => {
        if (note.image) {
          const url = await Storage.get(note.name);
          note.image = url;
        }
        return note;
      })
    );
    setNotes(notesFromAPI);
  }

  async function AddFoodItem() {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [price, setPrice] = useState(0);
    const [imageFile, setImageFile] = useState(null);

    const handleNameChange = (e) => setName(e.target.value);
    const handleDescriptionChange = (e) => setDescription(e.target.value);
    const handlePriceChange = (e) => setPrice(e.target.value);
    const handleImageChange = (e) => setImageFile(e.target.files[0]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      const filename = `${Date.now()}-${imageFile.name}`;
      const imageLocation = await Storage.put(filename, imageFile, {
        contentType: imageFile.type,
      });
      // make a request to your API to add the food item to the database
      // include the name, description, price, and imageLocation in the request body
    };
  }

  async function deleteNote({ id, name }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await Storage.remove(name);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }
  const [foodItems, setFoodItems] = React.useState([]);

  async function createNote(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const image = form.get("image");
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      image: image,
    };
    if (!!data.image) await Storage.put(data.name, image);
    await API.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    fetchNotes();
    event.target.reset();
  }
  async function addFoodItem(name, description, price, imageFile) {
    try {
      // Upload image to S3
      const imageKey = await Storage.put(name, imageFile);
      // Create new food item
      const data = {
        name: name,
        description: description,
        price: price,
        image: imageKey,
      };
      await API.graphql({
        query: createFoodItemMutation,
        variables: { input: data },
      });
    } catch (error) {
      console.log("Error creating food item:", error);
    }
  }

  return (
    <View className="App">
      <Heading level={1}>Shopping List</Heading>
      <div>
        <h2>Add Food Item</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const name = event.target.name.value;
            const description = event.target.description.value;
            const price = parseFloat(event.target.price.value);
            const imageFile = event.target.image.files[0];
            addFoodItem(name, description, price, imageFile);
          }}
        >
          <div>
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" name="name" />
          </div>
          <div>
            <label htmlFor="description">Description:</label>
            <input type="text" id="description" name="description" />
          </div>
          <div>
            <label htmlFor="price">Price:</label>
            <input type="number" id="price" name="price" step="0.01" />
          </div>
          <div>
            <label htmlFor="image">Image:</label>
            <input type="file" id="image" name="image" accept="image/*" />
          </div>
          <button type="submit">Add Food Item</button>
        </form>
      </div>
      <div>
        <h2>Food Items</h2>
        <ul>
          {foodItems.map((foodItem) => (
            <li key={foodItem.id}>
              <div>
                <img src={foodItem.image} alt={foodItem.name} />
              </div>
              <div>
                <h3>{foodItem.name}</h3>
                <p>{foodItem.description}</p>
                <p>${foodItem.price.toFixed(2)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <Button onClick={signOut}>Sign Out</Button>
      <View name="image" as="input" type="file" style={{ alignSelf: "end" }} />
    </View>
  );
};

export default withAuthenticator(App);
