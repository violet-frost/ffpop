"""Compose two original, seamlessly looping game cues using Python's standard library."""
from pathlib import Path
from array import array
import math, random, wave, sys
RATE=22050
ROOT=Path(__file__).resolve().parents[1]/'assets/audio'
TAU=math.tau
def compose(name,bpm,game=False):
 beat=60/bpm;length=beat*64;n=round(length*RATE);mix=array('f',[0])*n
 rng=random.Random(592 if game else 184)
 def note(midi,start,duration,volume,voice='pluck'):
  freq=440*2**((midi-69)/12);count=int(duration*RATE)
  for j in range(count):
   t=j/RATE;u=t/duration
   attack=min(1,t/(.018 if voice=='pluck' else .09));release=min(1,(duration-t)/(.24 if voice=='warm' else .08))
   if voice=='warm':env=attack*release*math.exp(-1.6*u);sample=math.sin(TAU*freq*t)+.04*math.sin(TAU*freq*2*t)*math.exp(-4*u)
   elif voice=='pad':env=attack*release*.65;sample=math.sin(TAU*freq*t)+.17*math.sin(TAU*freq*2*t)
   elif voice=='flute':env=attack*release*(.8+.2*math.sin(math.pi*u));sample=math.sin(TAU*freq*t+.018*math.sin(TAU*5*t))+.13*math.sin(TAU*freq*2*t)
   else:env=attack*release*math.exp(-4*u);sample=math.sin(TAU*freq*t)+.32*math.sin(TAU*freq*2*t)*math.exp(-6*u)+.12*math.sin(TAU*freq*3*t)*math.exp(-9*u)
   mix[(round(start*RATE)+j)%n]+=sample*env*volume
 def tick(start,volume):
  for j in range(int(.065*RATE)):
   t=j/RATE;sample=(rng.random()*2-1)*math.exp(-t*65)*min(1,t/.002)
   mix[(round(start*RATE)+j)%n]+=sample*volume
 chords=[[48,52,55],[45,48,52],[41,45,48],[43,47,50],[40,43,47],[45,48,52],[41,45,50],[43,47,50]]
 home=[[76,79,81,79,76,74,72,74],[76,72,69,72,76,79,76,72],[77,81,84,81,79,77,76,74],[74,79,83,81,79,76,74,71],[76,79,83,79,76,74,71,74],[76,81,84,83,81,79,76,72],[77,81,86,84,81,77,76,74],[74,79,83,86,83,79,74,71]]
 play=[[72,76,79,84,79,76,74,79],[81,76,72,76,81,84,83,81],[77,81,84,81,79,77,76,72],[79,83,86,83,81,79,74,71],[76,79,83,86,83,79,76,74],[81,84,88,84,83,81,79,76],[77,81,86,84,81,77,74,77],[79,83,86,89,86,83,79,74]]
 for bar in range(16):
  chord=chords[bar%8];melody=(play if game else home)[bar%8];start=bar*4*beat
  # Both cues share a warm midrange palette; no sub-bass, bells or percussion.
  chord=[tone+5 for tone in chord]
  for tone in chord:note(tone+12,start,beat*4.2,.012,'pad')
  note(chord[0],start,beat*3.6,.025,'warm')
  for k in range(4):
   note(chord[[0,1,2,1][k]]+12,start+k*beat,beat*1.6,.032,'warm')
  for k in ([0,3,6] if game else [0,4,6]):
   pitch=melody[k]+5
   while pitch>77:pitch-=12
   while pitch<65:pitch+=12
   note(pitch,start+k*beat/2,beat*1.9,.048 if game else .052,'warm')
 peak=max(abs(x) for x in mix);gain=(.34 if game else .36)/max(peak,.001)
 pcm=array('h',(max(-32767,min(32767,round(x*gain*32767))) for x in mix))
 ROOT.mkdir(parents=True,exist_ok=True)
 with wave.open(str(ROOT/name),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
 print(name,round(length,2),'seconds; peak',round(max(abs(x) for x in pcm)/32768,3))
if __name__=='__main__':
 compose('music_home.wav',76)
 if '--home-only' not in sys.argv:compose('music_game.wav',80,True)

